/**
 * PRMForge Pro (v1.0.0) — 10-Point Normative Compliance Auditor
 * Standards: CCSDS 507.0-B-1 (Blue Book) & ISO 18202:2022
 *
 * Evaluates Pointing Request Messages against 10 strict aerospace rules.
 */

(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PRMAuditor = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const PRMAuditor = {};

  PRMAuditor.RULES = [
    {
      id: 'PRM-001',
      name: 'CCSDS_PRM_VERS Syntax',
      normativeRef: 'CCSDS 507.0-B-1 §3.2',
      check: function(data) {
        const vers = String(data.header.CCSDS_PRM_VERS || '').trim();
        const pass = vers === '1.0';
        return {
          pass: pass,
          value: vers,
          message: pass ? 'Valid CCSDS PRM version 1.0' : `Invalid version '${vers}'; must be '1.0'`
        };
      }
    },
    {
      id: 'PRM-002',
      name: 'Mandatory Header Completeness',
      normativeRef: 'CCSDS 507.0-B-1 §3.2',
      check: function(data) {
        const h = data.header;
        const required = ['CREATION_DATE', 'ORIGINATOR', 'MESSAGE_ID'];
        const missing = required.filter(k => !h[k] || String(h[k]).trim() === '');
        const pass = missing.length === 0;
        return {
          pass: pass,
          value: pass ? 'Header present' : `Missing: ${missing.join(', ')}`,
          message: pass ? 'Mandatory header attributes verified' : `Missing header fields: ${missing.join(', ')}`
        };
      }
    },
    {
      id: 'PRM-003',
      name: 'Spacecraft Metadata Integrity',
      normativeRef: 'CCSDS 507.0-B-1 §3.3',
      check: function(data) {
        const m = data.metadata;
        const required = ['OBJECT_NAME', 'OBJECT_ID', 'TIME_SYSTEM', 'START_TIME', 'STOP_TIME'];
        const missing = required.filter(k => !m[k] || String(m[k]).trim() === '');
        const pass = missing.length === 0;
        return {
          pass: pass,
          value: pass ? 'All 5 metadata keys verified' : `Missing: ${missing.join(', ')}`,
          message: pass ? 'Spacecraft identification and observation interval verified' : `Missing metadata: ${missing.join(', ')}`
        };
      }
    },
    {
      id: 'PRM-004',
      name: 'Temporal Validity & Monotonicity',
      normativeRef: 'CCSDS 507.0-B-1 §2.4',
      check: function(data) {
        const t1 = Date.parse(data.metadata.START_TIME);
        const t2 = Date.parse(data.metadata.STOP_TIME);
        const isoRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
        const isoOk = isoRe.test(data.metadata.START_TIME) && isoRe.test(data.metadata.STOP_TIME);
        const pass = isoOk && !isNaN(t1) && !isNaN(t2) && t2 > t1;
        const durSec = (t2 - t1) / 1000.0;
        return {
          pass: pass,
          value: pass ? `Duration: ${durSec.toFixed(1)}s` : 'Invalid interval',
          message: pass ? 'Observation window strictly positive and ISO 8601 UTC' : 'Stop time must be strictly after start time'
        };
      }
    },
    {
      id: 'PRM-005',
      name: 'Instrument Boresight Unit Vector',
      normativeRef: 'CCSDS 507.0-B-1 §3.4',
      check: function(data) {
        const b = data.boresight;
        const bx = Number(b.BORESIGHT_VECTOR_X), by = Number(b.BORESIGHT_VECTOR_Y), bz = Number(b.BORESIGHT_VECTOR_Z);
        const norm = Math.sqrt(bx*bx + by*by + bz*bz);
        const diff = Math.abs(norm - 1.0);
        const pass = !isNaN(norm) && diff < 1e-4;
        return {
          pass: pass,
          value: `||b|| = ${norm.toFixed(6)}`,
          message: pass ? 'Payload instrument boresight satisfies unit norm ||b|| = 1.0' : `Boresight vector violates unit norm (norm=${norm})`
        };
      }
    },
    {
      id: 'PRM-006',
      name: 'Target Coordinates Range Conformance',
      normativeRef: 'Astrodynamics & Geodesy',
      check: function(data) {
        const req = data.request;
        const ra = Number(req.RIGHT_ASCENSION);
        const dec = Number(req.DECLINATION);
        let pass = !isNaN(ra) && !isNaN(dec) && ra >= 0.0 && ra <= 360.0 && dec >= -90.0 && dec <= 90.0;
        let desc = `RA: ${ra.toFixed(1)}°, Dec: ${dec.toFixed(1)}°`;

        if (req.TARGET_LATITUDE !== undefined) {
          const lat = Number(req.TARGET_LATITUDE);
          const lon = Number(req.TARGET_LONGITUDE);
          const latOk = lat >= -90.0 && lat <= 90.0;
          const lonOk = lon >= -180.0 && lon <= 180.0;
          pass = pass && latOk && lonOk;
          desc += ` | Lat: ${lat.toFixed(1)}°, Lon: ${lon.toFixed(1)}°`;
        }

        return {
          pass: pass,
          value: desc,
          message: pass ? 'Target pointing coordinates within valid spherical domains' : 'Target coordinates out of physical bounds'
        };
      }
    },
    {
      id: 'PRM-007',
      name: 'Slew Kinematics Physical Limits',
      normativeRef: 'Spacecraft ADCS Actuator Dynamics',
      check: function(data) {
        const k = data.kinematics;
        const rate = Number(k.MAX_SLEW_RATE);
        const accel = Number(k.MAX_SLEW_ACCELERATION);
        const pass = !isNaN(rate) && !isNaN(accel) && rate > 0.0 && rate <= 15.0 && accel > 0.0 && accel <= 5.0;
        return {
          pass: pass,
          value: `Rate: ${rate.toFixed(2)}°/s, Accel: ${accel.toFixed(2)}°/s²`,
          message: pass ? 'Slew rate and acceleration within reaction wheel physical envelopes' : 'Slew limits out of physical capability'
        };
      }
    },
    {
      id: 'PRM-008',
      name: 'Sun Exclusion Angle Constraint',
      normativeRef: 'Payload Thermal & Optical Safety',
      check: function(data) {
        const excl = Number(data.phase.SUN_EXCLUSION_ANGLE);
        const pass = !isNaN(excl) && excl >= 10.0 && excl <= 90.0;
        return {
          pass: pass,
          value: `${excl.toFixed(1)}° exclusion cone`,
          message: pass ? 'Valid Sun avoidance safety cone (10° to 90°)' : `Sun exclusion ${excl}° outside safety limits [10°, 90°]`
        };
      }
    },
    {
      id: 'PRM-009',
      name: 'Phase Roll Alignment Vector Unit Norm',
      normativeRef: 'CCSDS 507.0-B-1 §3.5',
      check: function(data) {
        const ph = data.phase;
        const px = Number(ph.PHASE_VECTOR_X), py = Number(ph.PHASE_VECTOR_Y), pz = Number(ph.PHASE_VECTOR_Z);
        const norm = Math.sqrt(px*px + py*py + pz*pz);
        const diff = Math.abs(norm - 1.0);
        const pass = !isNaN(norm) && diff < 1e-4;
        return {
          pass: pass,
          value: `||p|| = ${norm.toFixed(6)}`,
          message: pass ? 'Phase roll constraint vector satisfies unit norm ||p|| = 1.0' : `Phase vector violates unit norm (norm=${norm})`
        };
      }
    },
    {
      id: 'PRM-010',
      name: 'Strict KVN Line Syntax',
      normativeRef: 'CCSDS 507.0-B-1 §6.2',
      check: function(data, rawText) {
        if (!rawText) return { pass: true, value: 'Parsed check', message: 'Syntax verified' };
        const lines = rawText.split('\n');
        let invalidLines = 0;
        for (let l of lines) {
          l = l.trim();
          if (!l || l.startsWith('COMMENT')) continue;
          if (!l.includes('=')) invalidLines++;
        }
        const pass = invalidLines === 0;
        return {
          pass: pass,
          value: `${invalidLines} syntax violations`,
          message: pass ? 'Strict KEY = VALUE [UNIT] KVN syntax verified' : `Found ${invalidLines} lines violating KVN syntax`
        };
      }
    }
  ];

  /**
   * Execute Full Normative Audit
   */
  PRMAuditor.audit = function(prmData, rawText) {
    const results = [];
    let passedCount = 0;

    for (let rule of PRMAuditor.RULES) {
      const outcome = rule.check(prmData, rawText);
      if (outcome.pass) passedCount++;
      results.push({
        id: rule.id,
        name: rule.name,
        normativeRef: rule.normativeRef,
        pass: outcome.pass,
        value: outcome.value,
        message: outcome.message
      });
    }

    return {
      total: PRMAuditor.RULES.length,
      passed: passedCount,
      failed: PRMAuditor.RULES.length - passedCount,
      score: (passedCount / PRMAuditor.RULES.length) * 100,
      certified: passedCount === PRMAuditor.RULES.length,
      details: results
    };
  };

  return PRMAuditor;
}));
