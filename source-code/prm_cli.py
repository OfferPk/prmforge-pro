#!/usr/bin/env python3
"""
PRMForge Pro (v1.0.0) — Command-Line Pointing Request & Observation Planning Tool
Standards: CCSDS 507.0-B-1 (Blue Book) & ISO 18202:2022
Pure Python 3 implementation with zero external dependencies.
"""

import sys
import os
import math
import argparse
import json
import re
from datetime import datetime

PRESETS = {
    'surface': {
        'name': 'Earth Observation: Surface Ground Target Track',
        'request_id': 'REQ-OBS-2026-001',
        'request_type': 'SURFACE_TARGET',
        'object_name': 'SENTINEL-2C',
        'object_id': '2024-160A',
        'start_time': '2026-10-17T09:15:00.000Z',
        'stop_time': '2026-10-17T09:25:00.000Z',
        'target': {
            'type': 'SURFACE_GEO',
            'name': 'SINDH_CALIBRATION_SITE',
            'lat_deg': 24.8607,
            'lon_deg': 67.0011,
            'alt_m': 15.0,
            'ra_deg': 145.20,
            'dec_deg': 12.80
        },
        'boresight_vector': [0.0, 0.0, 1.0],
        'phase_constraint': {
            'type': 'SUN_POINTING',
            'vector': [0.0, 1.0, 0.0]
        },
        'sun_vector': [0.866, 0.500, 0.0],
        'sun_exclusion_deg': 45.0,
        'kinematics': {
            'max_slew_rate_deg_s': 2.5,
            'max_slew_accel_deg_s2': 0.5
        }
    },
    'deepfield': {
        'name': 'Astrophysics: Deep Field Inertial Target Dwell',
        'request_id': 'REQ-ASTRO-2026-042',
        'request_type': 'INERTIAL_POINTING',
        'object_name': 'ROMAN-SPACE-TELESCOPE',
        'object_id': '2027-005A',
        'start_time': '2026-10-17T12:00:00.000Z',
        'stop_time': '2026-10-17T13:30:00.000Z',
        'target': {
            'type': 'CELESTIAL_COORDINATES',
            'name': 'COSMOS_DEEP_FIELD',
            'ra_deg': 189.200,
            'dec_deg': 62.200
        },
        'boresight_vector': [0.0, 0.0, 1.0],
        'phase_constraint': {
            'type': 'ANTI_SUN_SHIELD',
            'vector': [0.0, -1.0, 0.0]
        },
        'sun_vector': [0.0, 1.0, 0.0],
        'sun_exclusion_deg': 85.0,
        'kinematics': {
            'max_slew_rate_deg_s': 0.2,
            'max_slew_accel_deg_s2': 0.05
        }
    },
    'oisl': {
        'name': 'Inter-Satellite: Laser Crosslink Fast Acquisition',
        'request_id': 'REQ-OISL-2026-889',
        'request_type': 'TARGET_TRACKING',
        'object_name': 'STARLINK-31042',
        'object_id': '2024-089AA',
        'start_time': '2026-10-17T18:00:00.000Z',
        'stop_time': '2026-10-17T18:15:00.000Z',
        'target': {
            'type': 'ORBITAL_COMPANION',
            'name': 'STARLINK-31043',
            'ra_deg': 215.40,
            'dec_deg': -18.60
        },
        'boresight_vector': [1.0, 0.0, 0.0],
        'phase_constraint': {
            'type': 'EARTH_AVOIDANCE',
            'vector': [0.0, 0.0, 1.0]
        },
        'sun_vector': [0.5, 0.5, 0.707],
        'sun_exclusion_deg': 35.0,
        'kinematics': {
            'max_slew_rate_deg_s': 3.5,
            'max_slew_accel_deg_s2': 1.0
        }
    }
}

def normalize(v):
    norm = math.sqrt(sum(x*x for x in v))
    if norm == 0: return [0.0, 0.0, 1.0]
    return [x / norm for x in v]

def dot(a, b):
    return sum(x*y for x, y in zip(a, b))

def angular_sep_deg(v1, v2):
    u1, u2 = normalize(v1), normalize(v2)
    val = max(-1.0, min(1.0, dot(u1, u2)))
    return math.degrees(math.acos(val))

def calculate_slew_duration(slew_angle_deg, max_rate, max_accel):
    if slew_angle_deg <= 0:
        return 0.0, 'NONE'
    theta_crit = (max_rate * max_rate) / max_accel
    if slew_angle_deg >= theta_crit:
        t_acc = max_rate / max_accel
        t_flat = (slew_angle_deg - theta_crit) / max_rate
        return 2.0 * t_acc + t_flat, 'TRAPEZOIDAL'
    else:
        peak_rate = math.sqrt(slew_angle_deg * max_accel)
        return 2.0 * (peak_rate / max_accel), 'TRIANGULAR'

def generate_prm(preset_key='surface'):
    p = PRESETS.get(preset_key, PRESETS['surface'])
    now_iso = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
    b = normalize(p['boresight_vector'])
    ph = normalize(p['phase_constraint']['vector'])
    sep_deg = angular_sep_deg(b, p['sun_vector'])
    sun_ok = sep_deg >= p['sun_exclusion_deg']

    lines = [
        "CCSDS_PRM_VERS = 1.0",
        "COMMENT ====================================================================",
        "COMMENT  PRMForge Pro (v1.0.0) — CCSDS 507.0-B-1 Pointing Request Message",
        "COMMENT  Spacecraft Payload Observation Planning Studio",
        "COMMENT ====================================================================",
        f"CREATION_DATE               = {now_iso}",
        "ORIGINATOR                  = PRMFORGE_PRO_SOC",
        f"MESSAGE_ID                  = {p['request_id']}",
        "",
        "COMMENT --------------------------------------------------------------------",
        "COMMENT  SPACECRAFT METADATA BLOCK",
        "COMMENT --------------------------------------------------------------------",
        f"OBJECT_NAME                 = {p['object_name']}",
        f"OBJECT_ID                   = {p['object_id']}",
        "TIME_SYSTEM                 = UTC",
        f"START_TIME                  = {p['start_time']}",
        f"STOP_TIME                   = {p['stop_time']}",
        "",
        "COMMENT --------------------------------------------------------------------",
        "COMMENT  POINTING REQUEST BLOCK",
        "COMMENT --------------------------------------------------------------------",
        f"REQUEST_ID                  = {p['request_id']}",
        f"REQUEST_TYPE                = {p['request_type']}",
        f"TARGET_TYPE                 = {p['target']['type']}",
        f"TARGET_NAME                 = {p['target']['name']}",
        f"RIGHT_ASCENSION             = {p['target']['ra_deg']:.4f} [deg]",
        f"DECLINATION                 = {p['target']['dec_deg']:.4f} [deg]"
    ]

    if 'lat_deg' in p['target']:
        lines.append(f"TARGET_LATITUDE             = {p['target']['lat_deg']:.4f} [deg]")
        lines.append(f"TARGET_LONGITUDE            = {p['target']['lon_deg']:.4f} [deg]")
        lines.append(f"TARGET_ALTITUDE             = {p['target']['alt_m']:.1f} [m]")

    lines.extend([
        "",
        "COMMENT --------------------------------------------------------------------",
        "COMMENT  INSTRUMENT BORESIGHT & PHASE CONSTRAINTS",
        "COMMENT --------------------------------------------------------------------",
        f"BORESIGHT_VECTOR_X          = {b[0]:.6f}",
        f"BORESIGHT_VECTOR_Y          = {b[1]:.6f}",
        f"BORESIGHT_VECTOR_Z          = {b[2]:.6f}",
        f"PHASE_CONSTRAINT_TYPE       = {p['phase_constraint']['type']}",
        f"PHASE_VECTOR_X              = {ph[0]:.6f}",
        f"PHASE_VECTOR_Y              = {ph[1]:.6f}",
        f"PHASE_VECTOR_Z              = {ph[2]:.6f}",
        f"SUN_EXCLUSION_ANGLE         = {p['sun_exclusion_deg']:.2f} [deg]",
        f"COMMENT  SUN_SEPARATION = {sep_deg:.2f} deg ({'CLEAR' if sun_ok else 'VIOLATION'})",
        "",
        "COMMENT --------------------------------------------------------------------",
        "COMMENT  SLEW ATTITUDE KINEMATICS LIMITS",
        "COMMENT --------------------------------------------------------------------",
        f"MAX_SLEW_RATE               = {p['kinematics']['max_slew_rate_deg_s']:.3f} [deg/s]",
        f"MAX_SLEW_ACCELERATION       = {p['kinematics']['max_slew_accel_deg_s2']:.3f} [deg/s**2]"
    ])
    return '\n'.join(lines)

def parse_prm(text):
    result = {'header': {}, 'metadata': {}, 'request': {}, 'boresight': {}, 'phase': {}, 'kinematics': {}}
    section = 'header'
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith('COMMENT'): continue
        if '=' in line:
            parts = line.split('=', 1)
            key = parts[0].strip()
            val = parts[1].strip()
            m = re.match(r'^(.+?)\s*\[.+?\]$', val)
            if m: val = m.group(1).strip()

            if key == 'OBJECT_NAME': section = 'metadata'
            elif key == 'REQUEST_ID': section = 'request'
            elif key.startswith('BORESIGHT_'): section = 'boresight'
            elif key.startswith('PHASE_') or key.startswith('SUN_'): section = 'phase'
            elif key.startswith('MAX_SLEW_'): section = 'kinematics'

            if not key.endswith('_VERS') and not key.endswith('_TIME'):
                try:
                    num = float(val)
                    val = num
                except ValueError:
                    pass
            result[section][key] = val
    return result

def audit_prm(data, raw_text):
    checks = []

    # PRM-001
    v = str(data['header'].get('CCSDS_PRM_VERS', ''))
    checks.append(('PRM-001', 'CCSDS_PRM_VERS Syntax', v == '1.0', f"Version '{v}'"))

    # PRM-002
    h = data['header']
    req_h = ['CREATION_DATE', 'ORIGINATOR', 'MESSAGE_ID']
    m_h = [k for k in req_h if k not in h]
    checks.append(('PRM-002', 'Mandatory Header Completeness', len(m_h) == 0, f"Missing: {m_h}"))

    # PRM-003
    m = data['metadata']
    req_m = ['OBJECT_NAME', 'OBJECT_ID', 'TIME_SYSTEM', 'START_TIME', 'STOP_TIME']
    m_m = [k for k in req_m if k not in m]
    checks.append(('PRM-003', 'Spacecraft Metadata Integrity', len(m_m) == 0, f"Missing: {m_m}"))

    # PRM-004
    t1_s = str(m.get('START_TIME', ''))
    t2_s = str(m.get('STOP_TIME', ''))
    iso_re = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$')
    time_ok = bool(iso_re.match(t1_s) and iso_re.match(t2_s))
    if time_ok:
        try:
            dt1 = datetime.strptime(t1_s, '%Y-%m-%dT%H:%M:%S.%fZ')
            dt2 = datetime.strptime(t2_s, '%Y-%m-%dT%H:%M:%S.%fZ')
            time_ok = dt2 > dt1
            val_s = f"{(dt2-dt1).total_seconds():.1f}s"
        except ValueError:
            time_ok = False
            val_s = "Parse error"
    else:
        val_s = "ISO invalid"
    checks.append(('PRM-004', 'Temporal Validity & Monotonicity', time_ok, val_s))

    # PRM-005
    b = data['boresight']
    bx = float(b.get('BORESIGHT_VECTOR_X', 0))
    by = float(b.get('BORESIGHT_VECTOR_Y', 0))
    bz = float(b.get('BORESIGHT_VECTOR_Z', 0))
    norm_b = math.sqrt(bx*bx + by*by + bz*bz)
    b_ok = abs(norm_b - 1.0) < 1e-4
    checks.append(('PRM-005', 'Instrument Boresight Unit Vector', b_ok, f"||b||={norm_b:.6f}"))

    # PRM-006
    req = data['request']
    ra = float(req.get('RIGHT_ASCENSION', -1))
    dec = float(req.get('DECLINATION', -999))
    target_ok = (0.0 <= ra <= 360.0) and (-90.0 <= dec <= 90.0)
    checks.append(('PRM-006', 'Target Coordinates Range Conformance', target_ok, f"RA:{ra:.1f}° Dec:{dec:.1f}°"))

    # PRM-007
    k = data['kinematics']
    rate = float(k.get('MAX_SLEW_RATE', 0))
    accel = float(k.get('MAX_SLEW_ACCELERATION', 0))
    k_ok = 0.0 < rate <= 15.0 and 0.0 < accel <= 5.0
    checks.append(('PRM-007', 'Slew Kinematics Physical Limits', k_ok, f"Rate:{rate:.2f}°/s Accel:{accel:.2f}°/s²"))

    # PRM-008
    excl = float(data['phase'].get('SUN_EXCLUSION_ANGLE', 0))
    excl_ok = 10.0 <= excl <= 90.0
    checks.append(('PRM-008', 'Sun Exclusion Angle Constraint', excl_ok, f"{excl:.1f}° cone"))

    # PRM-009
    ph = data['phase']
    px = float(ph.get('PHASE_VECTOR_X', 0))
    py = float(ph.get('PHASE_VECTOR_Y', 0))
    pz = float(ph.get('PHASE_VECTOR_Z', 0))
    norm_ph = math.sqrt(px*px + py*py + pz*pz)
    ph_ok = abs(norm_ph - 1.0) < 1e-4
    checks.append(('PRM-009', 'Phase Roll Alignment Vector Unit Norm', ph_ok, f"||p||={norm_ph:.6f}"))

    # PRM-010
    syntax_errs = 0
    for line in raw_text.splitlines():
        line = line.strip()
        if line and not line.startswith('COMMENT') and '=' not in line:
            syntax_errs += 1
    checks.append(('PRM-010', 'Strict KVN Line Syntax', syntax_errs == 0, f"{syntax_errs} errors"))

    return checks

def main():
    parser = argparse.ArgumentParser(description="PRMForge Pro — CCSDS 507.0-B-1 Pointing Request CLI")
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')

    p_gen = subparsers.add_parser('generate-prm', help='Generate CCSDS PRM message')
    p_gen.add_argument('--preset', choices=['surface', 'deepfield', 'oisl'], default='surface')
    p_gen.add_argument('--output', '-o', help='Output file path')

    p_parse = subparsers.add_parser('parse', help='Parse PRM KVN file')
    p_parse.add_argument('input', help='Path to PRM file')

    p_audit = subparsers.add_parser('audit', help='Audit PRM KVN file against 10 normative rules')
    p_audit.add_argument('input', help='Path to PRM file')

    p_slew = subparsers.add_parser('estimate-slew', help='Calculate slew duration for angular displacement')
    p_slew.add_argument('--angle-deg', type=float, required=True, help='Angular slew displacement (deg)')
    p_slew.add_argument('--max-rate', type=float, default=2.5, help='Max slew rate (deg/s)')
    p_slew.add_argument('--max-accel', type=float, default=0.5, help='Max slew acceleration (deg/s^2)')

    args = parser.parse_args()

    if args.command == 'generate-prm':
        prm_str = generate_prm(args.preset)
        if args.output:
            with open(args.output, 'w') as f:
                f.write(prm_str)
            print(f"Generated PRM saved to {args.output}")
        else:
            print(prm_str)

    elif args.command == 'parse':
        with open(args.input, 'r') as f:
            content = f.read()
        parsed = parse_prm(content)
        print(json.dumps(parsed, indent=2))

    elif args.command == 'audit':
        with open(args.input, 'r') as f:
            content = f.read()
        parsed = parse_prm(content)
        checks = audit_prm(parsed, content)
        passed = sum(1 for c in checks if c[2])
        total = len(checks)
        print("=================================================================")
        print("  PRMForge Pro (v1.0.0) — 10-Point Normative Compliance Audit    ")
        print("  Standard: CCSDS 507.0-B-1 (Blue Book) & ISO 18202:2022          ")
        print("=================================================================")
        for rule_id, name, ok, val in checks:
            status = "[PASS]" if ok else "[FAIL]"
            print(f" {status} {rule_id}: {name:<40} | {val}")
        print("-----------------------------------------------------------------")
        print(f" Score: {passed}/{total} Passed ({(passed/total)*100:.1f}%)")
        if passed == total:
            print(" Verdict: CERTIFIED CONFORMANT (CCSDS_507_PRM_CERTIFIED)")
        else:
            print(" Verdict: NON-CONFORMANT")
            sys.exit(1)

    elif args.command == 'estimate-slew':
        dur, profile = calculate_slew_duration(args.angle_deg, args.max_rate, args.max_accel)
        print(f"Slew Angle: {args.angle_deg:.2f}° | Duration: {dur:.2f}s | Profile: {profile}")
    else:
        parser.print_help()

if __name__ == '__main__':
    main()
