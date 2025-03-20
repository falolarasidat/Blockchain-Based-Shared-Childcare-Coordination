# KidChain: Blockchain-Based Shared Childcare Coordination

KidChain is a decentralized application built on blockchain technology that enables families to coordinate shared childcare responsibilities in a transparent, fair, and secure manner.

## Overview

KidChain uses smart contracts to facilitate childcare coordination among participating families. The system tracks contributions, verifies qualifications, and ensures fair distribution of responsibilities.

## Core Smart Contracts

The platform is built on four primary smart contracts:

### 1. Family Registration Contract

Records details of participating households including:
- Family information and contact details
- Number of children
- Special preferences or requirements
- Active/inactive status

### 2. Schedule Management Contract

Coordinates childcare rotation among families:
- Creates and manages schedules
- Assigns time slots to host families
- Tracks participant registrations
- Manages slot status (scheduled, completed, cancelled)

### 3. Contribution Tracking Contract

Monitors hours provided by each participant:
- Records hours contributed by each family
- Verifies contribution records
- Maintains a balance of hours given vs. received
- Allows for adjustments by administrators

### 4. Skill Verification Contract

Records specialized training of care providers:
- Stores skill definitions and requirements
- Allows caregivers to register skills with proof
- Enables verification by authorized verifiers
- Tracks skill expiration dates

## Technical Implementation

KidChain is implemented using:

- **Smart Contracts**: Written in Clarity, a decidable smart contract language for the Stacks blockchain
- **Frontend**: Built with Next.js and Tailwind CSS
- **Testing**: Comprehensive test suite using Vitest

## Getting Started

### Prerequisites

- Node.js (v16+)
- A Stacks wallet (for blockchain interactions)

### Installation

1. Clone the repository:
