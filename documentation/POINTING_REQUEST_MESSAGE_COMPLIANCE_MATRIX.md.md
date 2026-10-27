# Pointing Request Message (PRM) 10-Point Normative Compliance Matrix

| Rule ID | Check Item | Normative Reference | Verification Method | Pass Criteria |
| :---- | :---- | :---- | :---- | :---- |
| **PRM-001** | CCSDS\_PRM\_VERS Syntax | CCSDS 507.0-B-1 §3.2 | Version String Match | Must equal '1.0' |
| **PRM-002** | Mandatory Header Completeness | CCSDS 507.0-B-1 §3.2 | Field Presence Check | CREATION\_DATE, ORIGINATOR, MESSAGE\_ID all present and non-empty |
| **PRM-003** | Spacecraft Metadata Integrity | CCSDS 507.0-B-1 §3.3 | Entity Validation | OBJECT\_NAME, OBJECT\_ID, TIME\_SYSTEM, START\_TIME, STOP\_TIME verified |
| **PRM-004** | Temporal Validity & Monotonicity | CCSDS 507.0-B-1 §2.4 | Strict ISO Regex & Datetime Parse | STOP\_TIME \> START\_TIME and conforms to YYYY-MM-DDThh:mm:ss\[.sss\]Z |
| **PRM-005** | Instrument Boresight Unit Vector | Spacecraft Payload Kinematics | Vector Norm Check | \$\|\\mathbf{b}\| \= \\sqrt{b\_x^2 \+ b\_y^2 \+ b\_z^2} \= 1.0 \\pm 10^{-4}\$ |
| **PRM-006** | Target Coordinates Range Conformance | Astrodynamics & Geodesy | Coordinate Domain Check | \$0^\\circ \\le RA \\le 360^\\circ, \-90^\\circ \\le Dec \\le \+90^\\circ\$ (and Lat/Lon bounds) |
| **PRM-007** | Slew Kinematics Physical Limits | ADCS Actuator Dynamics | Rate & Acceleration Bounds | \$0 \< \\text{rate} \\le 15.0\$ deg/s and \$0 \< \\text{accel} \\le 5.0\$ deg/s² |
| **PRM-008** | Sun Exclusion Angle Constraint | Optical & Thermal Safety | Exclusion Cone Validation | \$10.0^\\circ \\le \\theta\_{excl} \\le 90.0^\\circ\$ |
| **PRM-009** | Phase Roll Alignment Vector Unit Norm | CCSDS 507.0-B-1 §3.5 | Vector Norm Check | \$\|\\mathbf{p}\| \= \\sqrt{p\_x^2 \+ p\_y^2 \+ p\_z^2} \= 1.0 \\pm 10^{-4}\$ |
| **PRM-010** | Strict KVN Line Syntax | CCSDS 507.0-B-1 §6.2 | Lexical Syntax Parser | Strict KEY \= VALUE \[UNIT\] structure without unkeyed drift |

