# CCSDS 507.0-B-1 & ISO 18202 Pointing Request Message (PRM) Technical Specification

## 1\. Executive Summary & Normative Scope

The Consultative Committee for Space Data Systems (CCSDS) 507.0-B-1 Blue Book and ISO 18202:2022 standard establish an authoritative, standardized electronic message format for communicating spacecraft payload and platform attitude pointing requests.

PRM standardizes the operational interface between:

- Science Operations Centers (SOC) and observation planners.  
- Payload Principal Investigators (PIs) and instrument calibration teams.  
- Satellite Flight Dynamics Facilities (FDF) and Mission Control Centers (MCC).  
- Ground tracking stations and satellite constellation automated schedulers.

---

## 2\. Pointing Request Architecture & Coordinate Standards

### 2.1 Target Definitions

A Pointing Request Message encapsulates one or more target definitions:

- **Inertial Celestial Targets (`TARGET_TYPE = CELESTIAL_COORDINATES`)**: Right Ascension (\$\\alpha\$) and Declination (\$\\delta\$) in degrees in the Geocentric Celestial Reference Frame (GCRF) or EME2000.  
- **Surface Geographic Targets (`TARGET_TYPE = SURFACE_GEO`)**: Geocentric/geodetic latitude, longitude, and elevation above WGS-84 reference ellipsoid for ground station tracking or pushbroom calibration.  
- **Celestial Bodies (`TARGET_TYPE = CELESTIAL_BODY`)**: Center-of-mass tracking for Moon, Sun, planets, or asteroids.  
- **Orbital Targets (`TARGET_TYPE = ORBITAL_COMPANION`)**: Relative line-of-sight tracking for inter-satellite optical links (OISL) and rendezvous maneuvers.

### 2.2 Instrument Boresight Vector

The instrument optical axis or antenna boresight is specified as a 3D unit vector in the spacecraft body frame (`SC_BODY_1`): \$\$\\mathbf{b} \= \[b\_x, b\_y, b\_z\]^T, \\quad \|\\mathbf{b}\| \= \\sqrt{b\_x^2 \+ b\_y^2 \+ b\_z^2} \= 1.0\$\$

### 2.3 Attitude Phase Constraints & Roll Freedom

Aligning a single boresight vector leaves 1 degree of rotational freedom (roll about the boresight axis). A secondary phase constraint vector \$\\mathbf{p}\$ resolves this freedom:

- **`SUN_POINTING`**: Aligns solar array normal vectors toward the Sun during observation.  
- **`ANTI_SUN_SHIELD`**: Aligns protective multi-layer thermal sun-shields away from solar radiation.  
- **`EARTH_AVOIDANCE`**: Ensures star tracker optical sensors do not illuminate the illuminated Earth limb.

### 2.4 Sun Exclusion Zone Constraints

To prevent irreversible damage to optical detector arrays (CCDs/CMOS) and star tracker blinding, PRMs specify a minimum angular separation cone \$\\theta\_{excl}\$: \$\$\\theta\_{sep} \= \\arccos(\\mathbf{b} \\cdot \\mathbf{s}) \\ge \\theta\_{excl}\$\$ where \$\\mathbf{s}\$ is the Sun unit vector in the target reference frame.

---

## 3\. Normative KVN Pointing Request Message (PRM) Structure

CCSDS\_PRM\_VERS \= 1.0

CREATION\_DATE               \= 2026-10-17T09:15:00.000Z

ORIGINATOR                  \= PRMFORGE\_PRO\_SOC

MESSAGE\_ID                  \= REQ-OBS-2026-001

OBJECT\_NAME                 \= SENTINEL-2C

OBJECT\_ID                   \= 2024-160A

TIME\_SYSTEM                 \= UTC

START\_TIME                  \= 2026-10-17T09:15:00.000Z

STOP\_TIME                   \= 2026-10-17T09:25:00.000Z

REQUEST\_ID                  \= REQ-OBS-2026-001

REQUEST\_TYPE                \= SURFACE\_TARGET

TARGET\_TYPE                 \= SURFACE\_GEO

TARGET\_NAME                 \= SINDH\_CALIBRATION\_SITE

RIGHT\_ASCENSION             \= 145.2000 \[deg\]

DECLINATION                 \= 12.8000 \[deg\]

TARGET\_LATITUDE             \= 24.8607 \[deg\]

TARGET\_LONGITUDE            \= 67.0011 \[deg\]

TARGET\_ALTITUDE             \= 15.0 \[m\]

BORESIGHT\_VECTOR\_X          \= 0.000000

BORESIGHT\_VECTOR\_Y          \= 0.000000

BORESIGHT\_VECTOR\_Z          \= 1.000000

PHASE\_CONSTRAINT\_TYPE       \= SUN\_POINTING

PHASE\_VECTOR\_X              \= 0.000000

PHASE\_VECTOR\_Y              \= 1.000000

PHASE\_VECTOR\_Z              \= 0.000000

SUN\_EXCLUSION\_ANGLE         \= 45.00 \[deg\]

MAX\_SLEW\_RATE               \= 2.500 \[deg/s\]

MAX\_SLEW\_ACCELERATION       \= 0.500 \[deg/s\*\*2\]