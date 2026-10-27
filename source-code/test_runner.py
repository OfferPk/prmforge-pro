#!/usr/bin/env python3
"""
PRMForge Pro (v1.0.0) — Automated Test Suite
Standards: CCSDS 507.0-B-1 (Blue Book) & ISO 18202:2022
Tests pointing vector math, celestial coordinate conversions, Sun exclusion, slew kinematics, and the 10-point normative auditor.
"""

import unittest
import math
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prm_cli import (
    normalize,
    dot,
    angular_sep_deg,
    calculate_slew_duration,
    generate_prm,
    parse_prm,
    audit_prm,
    PRESETS
)

class TestPRMForgePro(unittest.TestCase):

    def test_01_prm_generation_surface(self):
        """1. Test standard Earth Observation Pointing Request Message (PRM) KVN generation."""
        prm_str = generate_prm('surface')
        self.assertIn("CCSDS_PRM_VERS = 1.0", prm_str)
        self.assertIn("ORIGINATOR                  = PRMFORGE_PRO_SOC", prm_str)
        self.assertIn("OBJECT_NAME                 = SENTINEL-2C", prm_str)
        self.assertIn("REQUEST_TYPE                = SURFACE_TARGET", prm_str)
        self.assertIn("TARGET_NAME                 = SINDH_CALIBRATION_SITE", prm_str)
        self.assertIn("SUN_EXCLUSION_ANGLE", prm_str)

    def test_02_prm_parsing_kvn(self):
        """2. Test KVN lexical parser, block segmentation, and numeric conversion."""
        prm_str = generate_prm('deepfield')
        parsed = parse_prm(prm_str)
        self.assertEqual(parsed['header']['CCSDS_PRM_VERS'], '1.0')
        self.assertEqual(parsed['metadata']['OBJECT_NAME'], 'ROMAN-SPACE-TELESCOPE')
        self.assertEqual(parsed['request']['TARGET_TYPE'], 'CELESTIAL_COORDINATES')
        self.assertAlmostEqual(float(parsed['request']['RIGHT_ASCENSION']), 189.2, places=2)
        self.assertAlmostEqual(float(parsed['request']['DECLINATION']), 62.2, places=2)
        self.assertEqual(float(parsed['boresight']['BORESIGHT_VECTOR_Z']), 1.0)

    def test_03_vector_normalization(self):
        """3. Test unit vector normalization."""
        v = [3.0, 4.0, 0.0]
        u = normalize(v)
        self.assertAlmostEqual(u[0], 0.6, places=5)
        self.assertAlmostEqual(u[1], 0.8, places=5)
        self.assertAlmostEqual(math.sqrt(sum(x*x for x in u)), 1.0, places=6)

    def test_04_angular_separation_orthogonal(self):
        """4. Test angular separation between orthogonal and parallel vectors."""
        v1 = [1.0, 0.0, 0.0]
        v2 = [0.0, 1.0, 0.0]
        sep_deg = angular_sep_deg(v1, v2)
        self.assertAlmostEqual(sep_deg, 90.0, places=5)

        # Opposite vectors -> 180 deg
        v3 = [-1.0, 0.0, 0.0]
        self.assertAlmostEqual(angular_sep_deg(v1, v3), 180.0, places=5)

    def test_05_sun_exclusion_zone_logic(self):
        """5. Test Sun avoidance exclusion cone safety verification."""
        boresight = [0.0, 0.0, 1.0] # Pointing +Z
        sun_safe = [1.0, 0.0, 0.0]  # Sun along +X (90 deg separation)
        sun_danger = [0.0, 0.1, 0.99] # Sun close to +Z (~5.7 deg separation)

        sep_safe = angular_sep_deg(boresight, sun_safe)
        sep_danger = angular_sep_deg(boresight, sun_danger)

        self.assertGreaterEqual(sep_safe, 45.0) # Safe
        self.assertLess(sep_danger, 45.0)       # Blinding danger

    def test_06_trapezoidal_slew_kinematics(self):
        """6. Test trapezoidal slew kinematics profile for large angular slews."""
        # Large slew 90 deg: max rate 2.0 deg/s, max accel 0.5 deg/s^2
        # theta_crit = 2.0^2 / 0.5 = 8.0 deg < 90 deg -> Trapezoidal
        dur, profile = calculate_slew_duration(90.0, 2.0, 0.5)
        self.assertEqual(profile, 'TRAPEZOIDAL')
        # t_acc = 2.0 / 0.5 = 4s. t_flat = (90 - 8) / 2.0 = 41s. total = 8 + 41 = 49s.
        self.assertAlmostEqual(dur, 49.0, places=2)

    def test_07_triangular_slew_kinematics(self):
        """7. Test triangular slew kinematics profile for small angular slews."""
        # Small slew 2.0 deg: max rate 2.0 deg/s, max accel 0.5 deg/s^2
        # theta_crit = 8.0 deg > 2.0 deg -> Triangular
        dur, profile = calculate_slew_duration(2.0, 2.0, 0.5)
        self.assertEqual(profile, 'TRIANGULAR')
        # peak_rate = sqrt(2.0 * 0.5) = 1.0 deg/s. dur = 2 * (1.0 / 0.5) = 4.0s
        self.assertAlmostEqual(dur, 4.0, places=2)

    def test_08_normative_auditor_pass(self):
        """8. Test 10-point normative auditor on compliant Earth observation PRM."""
        prm_str = generate_prm('surface')
        parsed = parse_prm(prm_str)
        checks = audit_prm(parsed, prm_str)
        self.assertEqual(len(checks), 10)
        passed_count = sum(1 for c in checks if c[2])
        self.assertEqual(passed_count, 10, f"Failed rules: {[c for c in checks if not c[2]]}")

    def test_09_normative_auditor_reject_invalid_vers(self):
        """9. Test auditor catches invalid CCSDS_PRM_VERS syntax."""
        prm_str = generate_prm('surface').replace("CCSDS_PRM_VERS = 1.0", "CCSDS_PRM_VERS = 3.5")
        parsed = parse_prm(prm_str)
        checks = audit_prm(parsed, prm_str)
        rule_001 = next(c for c in checks if c[0] == 'PRM-001')
        self.assertFalse(rule_001[2])

    def test_10_normative_auditor_reject_non_unit_boresight(self):
        """10. Test auditor catches unnormalized instrument boresight vector."""
        prm_str = generate_prm('surface').replace("BORESIGHT_VECTOR_Z          = 1.000000", "BORESIGHT_VECTOR_Z          = 5.000000")
        parsed = parse_prm(prm_str)
        checks = audit_prm(parsed, prm_str)
        rule_005 = next(c for c in checks if c[0] == 'PRM-005')
        self.assertFalse(rule_005[2])

if __name__ == '__main__':
    unittest.main()
