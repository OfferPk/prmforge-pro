/**
 * PRMForge Pro (v1.0.0) — Core Spacecraft Pointing Request & Observation Planning Engine
 * Standards: CCSDS 507.0-B-1 (Blue Book) & ISO 18202:2022
 *
 * Implements:
 * - Celestial coordinate transformations (RA/Dec <-> Inertial Cartesian Unit Vector)
 * - Instrument line-of-sight boresight & phase roll vector kinematics
 * - Sun/Moon optical sensor blinding exclusion zone boundary verification
 * - Slew duration & angular acceleration profile modeling (Trapezoidal / Triangular)
 * - CCSDS Pointing Request Message (PRM) KVN formatting & lexical parsing
 */

(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PRMEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const PRMEngine = {};

  /**
   * Predefined Observation Request Presets
   */
  PRMEngine.PRESETS = {
    EARTH_OBS_SURFACE: {
      name: 'Earth Observation: Surface Ground Target Track (Sentinel-2C / Landsat)',
      requestId: 'REQ-OBS-2026-001',
      requestType: 'SURFACE_TARGET',
      objectName: 'SENTINEL-2C',
      objectId: '2024-160A',
      startTime: '2026-10-17T09:15:00.000Z',
      stopTime: '2026-10-17T09:25:00.000Z',
      target: {
        type: 'SURFACE_GEO',
        name: 'SINDH_CALIBRATION_SITE',
        latDeg: 24.8607,
        lonDeg: 67.0011,
        altM: 15.0,
        raDeg: 145.20, // Derived topocentric celestial projection
        decDeg: 12.80
      },
      boresightVector: [0.0, 0.0, 1.0], // Payload camera +Z
      phaseConstraint: {
        type: 'SUN_POINTING',
        vector: [0.0, 1.0, 0.0] // +Y solar array normal to Sun
      },
      sunVector: [0.866, 0.500, 0.0], // Sample Sun unit vector
      sunExclusionDeg: 45.0,
      kinematics: {
        maxSlewRateDegS: 2.5,
        maxSlewAccelDegS2: 0.5
      }
    },
    DEEP_SPACE_ASTRONOMY: {
      name: 'Astrophysics: Deep Field Inertial Target Dwell (JWST / Roman Telescope)',
      requestId: 'REQ-ASTRO-2026-042',
      requestType: 'INERTIAL_POINTING',
      objectName: 'ROMAN-SPACE-TELESCOPE',
      objectId: '2027-005A',
      startTime: '2026-10-17T12:00:00.000Z',
      stopTime: '2026-10-17T13:30:00.000Z',
      target: {
        type: 'CELESTIAL_COORDINATES',
        name: 'COSMOS_DEEP_FIELD',
        raDeg: 189.200,
        decDeg: 62.200
      },
      boresightVector: [0.0, 0.0, 1.0], // Primary optical mirror +Z
      phaseConstraint: {
        type: 'ANTI_SUN_SHIELD',
        vector: [0.0, -1.0, 0.0] // Sun shield normal
      },
      sunVector: [0.0, 1.0, 0.0],
      sunExclusionDeg: 85.0,
      kinematics: {
        maxSlewRateDegS: 0.2,
        maxSlewAccelDegS2: 0.05
      }
    },
    LASER_OISL_CROSSLINK: {
      name: 'Inter-Satellite: Laser Crosslink Fast Acquisition (Starlink / Kuiper OISL)',
      requestId: 'REQ-OISL-2026-889',
      requestType: 'TARGET_TRACKING',
      objectName: 'STARLINK-31042',
      objectId: '2024-089AA',
      startTime: '2026-10-17T18:00:00.000Z',
      stopTime: '2026-10-17T18:15:00.000Z',
      target: {
        type: 'ORBITAL_COMPANION',
        name: 'STARLINK-31043',
        raDeg: 215.40,
        decDeg: -18.60
      },
      boresightVector: [1.0, 0.0, 0.0], // Optical head along-track +X
      phaseConstraint: {
        type: 'EARTH_AVOIDANCE',
        vector: [0.0, 0.0, 1.0]
      },
      sunVector: [0.5, 0.5, 0.707],
      sunExclusionDeg: 35.0,
      kinematics: {
        maxSlewRateDegS: 3.5,
        maxSlewAccelDegS2: 1.0
      }
    }
  };

  /**
   * Vector Mathematics Utilities
   */
  PRMEngine.normalizeVector = function(v) {
    const norm = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    if (norm === 0) return [0, 0, 1];
    return [v[0]/norm, v[1]/norm, v[2]/norm];
  };

  PRMEngine.vectorNorm = function(v) {
    return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
  };

  PRMEngine.dot = function(a, b) {
    return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  };

  /**
   * Convert Right Ascension & Declination to Inertial Cartesian Unit Vector
   * @param {number} raDeg Right Ascension in degrees [0, 360]
   * @param {number} decDeg Declination in degrees [-90, +90]
   */
  PRMEngine.radecToVector = function(raDeg, decDeg) {
    const raRad = (raDeg * Math.PI) / 180.0;
    const decRad = (decDeg * Math.PI) / 180.0;
    return [
      Math.cos(decRad) * Math.cos(raRad),
      Math.cos(decRad) * Math.sin(raRad),
      Math.sin(decRad)
    ];
  };

  /**
   * Convert Inertial Cartesian Unit Vector to Right Ascension & Declination
   */
  PRMEngine.vectorToRadec = function(v) {
    const u = PRMEngine.normalizeVector(v);
    const decRad = Math.asin(Math.max(-1.0, Math.min(1.0, u[2])));
    let raRad = Math.atan2(u[1], u[0]);
    if (raRad < 0) raRad += 2 * Math.PI;
    return {
      raDeg: (raRad * 180.0) / Math.PI,
      decDeg: (decRad * 180.0) / Math.PI
    };
  };

  /**
   * Angular separation between two unit vectors (in degrees)
   */
  PRMEngine.angularSeparationDeg = function(v1, v2) {
    const u1 = PRMEngine.normalizeVector(v1);
    const u2 = PRMEngine.normalizeVector(v2);
    const dotVal = Math.max(-1.0, Math.min(1.0, PRMEngine.dot(u1, u2)));
    return (Math.acos(dotVal) * 180.0) / Math.PI;
  };

  /**
   * Verify Sun Exclusion Zone Constraint
   */
  PRMEngine.checkSunExclusion = function(boresightVec, sunVec, minExclusionDeg) {
    const sepDeg = PRMEngine.angularSeparationDeg(boresightVec, sunVec);
    const satisfied = sepDeg >= minExclusionDeg;
    return {
      satisfied: satisfied,
      separationDeg: sepDeg,
      minExclusionDeg: minExclusionDeg,
      marginDeg: sepDeg - minExclusionDeg,
      alert: satisfied ? 'NOMINAL_CLEARANCE' : 'SUN_BLINDING_VIOLATION'
    };
  };

  /**
   * Estimate Slew Duration & Kinematic Profile
   * Uses trapezoidal acceleration profile
   */
  PRMEngine.calculateSlewKinematics = function(slewAngleDeg, maxRateDegS, maxAccelDegS2) {
    if (slewAngleDeg <= 0) return { slewTimeSec: 0, profile: 'NONE', peakRateDegS: 0 };

    const thetaCrit = (maxRateDegS * maxRateDegS) / maxAccelDegS2;
    let tSlew, peakRate, profile;

    if (slewAngleDeg >= thetaCrit) {
      // Trapezoidal profile: reaches max slew rate
      profile = 'TRAPEZOIDAL';
      const tAcc = maxRateDegS / maxAccelDegS2;
      const tFlat = (slewAngleDeg - thetaCrit) / maxRateDegS;
      tSlew = 2.0 * tAcc + tFlat;
      peakRate = maxRateDegS;
    } else {
      // Triangular profile: does not reach max rate
      profile = 'TRIANGULAR';
      peakRate = Math.sqrt(slewAngleDeg * maxAccelDegS2);
      tSlew = 2.0 * (peakRate / maxAccelDegS2);
    }

    return {
      slewAngleDeg: slewAngleDeg,
      slewTimeSec: tSlew,
      profile: profile,
      peakRateDegS: peakRate,
      maxRateDegS: maxRateDegS,
      maxAccelDegS2: maxAccelDegS2
    };
  };

  /**
   * Generate Full CCSDS 507.0-B-1 Pointing Request Message (KVN Format)
   */
  PRMEngine.generatePRMKVN = function(config) {
    const p = config || PRMEngine.PRESETS.EARTH_OBS_SURFACE;
    const nowISO = new Date().toISOString();
    const bVec = PRMEngine.normalizeVector(p.boresightVector);
    const pVec = PRMEngine.normalizeVector(p.phaseConstraint.vector);
    const sunCheck = PRMEngine.checkSunExclusion(bVec, p.sunVector, p.sunExclusionDeg);

    const lines = [
      'CCSDS_PRM_VERS = 1.0',
      'COMMENT ====================================================================',
      'COMMENT  PRMForge Pro (v1.0.0) — CCSDS 507.0-B-1 / ISO 18202 Pointing Request Message',
      'COMMENT  Spacecraft Payload Observation Planning & Slew Dynamics Studio',
      'COMMENT ====================================================================',
      `CREATION_DATE               = ${nowISO}`,
      'ORIGINATOR                  = PRMFORGE_PRO_SOC',
      `MESSAGE_ID                  = ${p.requestId}`,
      '',
      'COMMENT --------------------------------------------------------------------',
      'COMMENT  SPACECRAFT METADATA BLOCK',
      'COMMENT --------------------------------------------------------------------',
      `OBJECT_NAME                 = ${p.objectName}`,
      `OBJECT_ID                   = ${p.objectId}`,
      'TIME_SYSTEM                 = UTC',
      `START_TIME                  = ${p.startTime}`,
      `STOP_TIME                   = ${p.stopTime}`,
      '',
      'COMMENT --------------------------------------------------------------------',
      'COMMENT  POINTING REQUEST BLOCK',
      'COMMENT --------------------------------------------------------------------',
      `REQUEST_ID                  = ${p.requestId}`,
      `REQUEST_TYPE                = ${p.requestType}`,
      `TARGET_TYPE                 = ${p.target.type}`,
      `TARGET_NAME                 = ${p.target.name}`,
      `RIGHT_ASCENSION             = ${p.target.raDeg.toFixed(4)} [deg]`,
      `DECLINATION                 = ${p.target.decDeg.toFixed(4)} [deg]`
    ];

    if (p.target.latDeg !== undefined) {
      lines.push(`TARGET_LATITUDE             = ${p.target.latDeg.toFixed(4)} [deg]`);
      lines.push(`TARGET_LONGITUDE            = ${p.target.lonDeg.toFixed(4)} [deg]`);
      lines.push(`TARGET_ALTITUDE             = ${p.target.altM.toFixed(1)} [m]`);
    }

    lines.push('');
    lines.push('COMMENT --------------------------------------------------------------------');
    lines.push('COMMENT  INSTRUMENT BORESIGHT & PHASE CONSTRAINTS');
    lines.push('COMMENT --------------------------------------------------------------------');
    lines.push(`BORESIGHT_VECTOR_X          = ${bVec[0].toFixed(6)}`);
    lines.push(`BORESIGHT_VECTOR_Y          = ${bVec[1].toFixed(6)}`);
    lines.push(`BORESIGHT_VECTOR_Z          = ${bVec[2].toFixed(6)}`);
    lines.push(`PHASE_CONSTRAINT_TYPE       = ${p.phaseConstraint.type}`);
    lines.push(`PHASE_VECTOR_X              = ${pVec[0].toFixed(6)}`);
    lines.push(`PHASE_VECTOR_Y              = ${pVec[1].toFixed(6)}`);
    lines.push(`PHASE_VECTOR_Z              = ${pVec[2].toFixed(6)}`);
    lines.push(`SUN_EXCLUSION_ANGLE         = ${p.sunExclusionDeg.toFixed(2)} [deg]`);
    lines.push(`COMMENT  SUN_SEPARATION_MARGIN = ${sunCheck.marginDeg.toFixed(2)} deg (${sunCheck.alert})`);
    lines.push('');
    lines.push('COMMENT --------------------------------------------------------------------');
    lines.push('COMMENT  SLEW ATTITUDE KINEMATICS LIMITS');
    lines.push('COMMENT --------------------------------------------------------------------');
    lines.push(`MAX_SLEW_RATE               = ${p.kinematics.maxSlewRateDegS.toFixed(3)} [deg/s]`);
    lines.push(`MAX_SLEW_ACCELERATION       = ${p.kinematics.maxSlewAccelDegS2.toFixed(3)} [deg/s**2]`);

    return lines.join('\n');
  };

  /**
   * Parse KVN PRM Text into Structured Object
   */
  PRMEngine.parsePRMKVN = function(text) {
    const result = {
      header: {},
      metadata: {},
      request: {},
      boresight: {},
      phase: {},
      kinematics: {},
      comments: []
    };

    let section = 'header';
    const lines = text.split('\n');

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      if (line.startsWith('COMMENT')) {
        result.comments.push(line.replace(/^COMMENT\s*/, ''));
        continue;
      }

      if (line.includes('=')) {
        const parts = line.split('=');
        const key = parts[0].trim();
        let val = parts.slice(1).join('=').trim();
        const m = val.match(/^(.+?)\s*\[.+?\]$/);
        if (m) val = m[1].trim();

        if (key === 'OBJECT_NAME') section = 'metadata';
        else if (key === 'REQUEST_ID') section = 'request';
        else if (key.startsWith('BORESIGHT_')) section = 'boresight';
        else if (key.startsWith('PHASE_') || key.startsWith('SUN_')) section = 'phase';
        else if (key.startsWith('MAX_SLEW_')) section = 'kinematics';

        const num = Number(val);
        const finalVal = (!isNaN(num) && val !== '' && !key.endsWith('_VERS') && !key.endsWith('_TIME')) ? num : val;
        result[section][key] = finalVal;
      }
    }

    return result;
  };

  return PRMEngine;
}));
