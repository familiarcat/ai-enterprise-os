#!/bin/bash
# Reorganize mission domain files to adhere to DDD philosophy

mkdir -p domains/mission/application
mkdir -p domains/mission/infrastructure
mkdir -p domains/mission/domain

# Move Application Layer files
mv MissionDTO.js domains/mission/application/

# Move Infrastructure Layer files
mv MissionRepository.js domains/mission/infrastructure/
mv apps/api/MissionSubscriber.js domains/mission/infrastructure/

# Move Tests
mv mission-events.test.js domains/mission/tests/

echo "🖖 Reorganization complete. File system aligned with DDD protocols."