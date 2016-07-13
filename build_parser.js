#!/usr/bin/env node

if (require.main === module) {
    console.log('building shit son')
    require('lib/_command')(require('lib/bootstrap'))
}
