#!/usr/bin/env node

if (require.main === module) {
    require('lib/_command')(require('lib/bootstrap'))
}
