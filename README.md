# PRMForge Pro (v1.0.0)

## CCSDS 507.0-B-1 & ISO 18202 Spacecraft Pointing Request & Observation Planning Studio

PRMForge Pro is a commercial-grade, zero-dependency space science mission observation planning and payload pointing toolkit implementing the international standards **CCSDS 507.0-B-1 (Blue Book)** and **ISO 18202:2022**.

It delivers high-fidelity pointing target synthesis, celestial coordinate transformations, instrument boresight ray tracing, roll phase constraint management, Sun/Moon blinding exclusion cone verification, slew kinematics duration modeling, and normative compliance auditing for Pointing Request Messages (PRMs).

---

### Key Capabilities

- **Multi-Target Ingestion & Geometry**: Models inertial celestial coordinates (RA/Dec), surface geographic landmarks (Lat/Lon/Alt), and orbital inter-satellite line-of-sight pointing vectors.  
- **Instrument Boresight Alignment**: Formulates 3D unit boresight vectors in spacecraft body frame coordinates (`SC_BODY_1`) for optical cameras, radiometers, and antennas.  
- **Roll Phase Constraints**: Resolves rotational freedom about boresight axes via solar array Sun-pointing, anti-sun shield thermal alignment, or Earth limb avoidance.  
- **Sun Exclusion Cone Verification**: Real-time evaluation of angular separation angles to prevent irreversible optical detector degradation and star tracker blinding.  
- **Slew Kinematics Modeling**: Predicts exact slew durations and acceleration profiles (trapezoidal and triangular) based on reaction wheel torque and momentum capacity.  
- **10-Point Normative Auditor**: Automated compliance verification checking versioning, metadata completeness, coordinate domains, boresight unit norms, and strict KVN grammar.  
- **Zero-Dependency Architecture**: Standalone pure JavaScript operations console with interactive 3D celestial sphere rendering and pure Python 3 CLI planning utility.

---

### Project Structure

prm-forge-pro/

├── source-code/

│   ├── index.html                   \# Mission Operations Web Console & 3D Celestial Sphere

│   ├── prm-engine.js                \# Core Pointing Geometry & Slew Kinematics Engine

│   ├── prm-auditor.js               \# 10-Point CCSDS/ISO Normative Compliance Auditor

│   ├── prm\_cli.py                   \# Python 3 Command-Line Observation Planning Tool

│   ├── prm-cli.py                   \# CLI Executable Alias

│   └── test\_runner.py               \# Automated Unit Test Suite (10/10 PASS)

├── build/

│   └── prm-forge-pro-v1.0.0.zip      \# Complete Production Release Package

├── documentation/

│   ├── CCSDS\_PRM\_SPECIFICATION.md   \# Protocol Engineering Guide

│   └── POINTING\_REQUEST\_MESSAGE\_COMPLIANCE\_MATRIX.md \# 10-Point Compliance Checklist

├── screenshots/

│   ├── architecture-diagram.svg     \# End-to-End System Architecture

│   └── prm-studio-preview.svg       \# Mission Console UI & Celestial Sphere Preview

├── README.md                        \# Product Overview & Developer Guide

└── PROGRESS\_REPORT.md               \# Product Factory Cycle Execution Report

---

### Automated Test Suite Execution

python3 source-code/test\_runner.py \-v

Output:

test\_01\_prm\_generation\_surface (\_\_main\_\_.TestPRMForgePro) ... ok

test\_02\_prm\_parsing\_kvn (\_\_main\_\_.TestPRMForgePro) ... ok

test\_03\_vector\_normalization (\_\_main\_\_.TestPRMForgePro) ... ok

test\_04\_angular\_separation\_orthogonal (\_\_main\_\_.TestPRMForgePro) ... ok

test\_05\_sun\_exclusion\_zone\_logic (\_\_main\_\_.TestPRMForgePro) ... ok

test\_06\_trapezoidal\_slew\_kinematics (\_\_main\_\_.TestPRMForgePro) ... ok

test\_07\_triangular\_slew\_kinematics (\_\_main\_\_.TestPRMForgePro) ... ok

test\_08\_normative\_auditor\_pass (\_\_main\_\_.TestPRMForgePro) ... ok

test\_09\_normative\_auditor\_reject\_invalid\_vers (\_\_main\_\_.TestPRMForgePro) ... ok

test\_10\_normative\_auditor\_reject\_non\_unit\_boresight (\_\_main\_\_.TestPRMForgePro) ... ok

Ran 10 tests in 0.010s

OK

---

### Licensing & Standards Compliance

- Standard: Consultative Committee for Space Data Systems (CCSDS) 507.0-B-1 & ISO 18202:2022.  
- Architecture: Zero-dependency ECMAScript 2022 & Python 3.8+.  
- Commercial License: Dual MIT / Commercial Aerospace Site License (\$2,800/yr).