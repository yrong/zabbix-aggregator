require("babel-core/register")
require("babel-polyfill")

var newman = require('newman');
var assert = require('chai').assert;

describe("scmp-z api Integration test suite", function() {
    this.timeout(15000)

    it('postman test cases', function(done) {
        newman.run({
            collection: require('./scmp-z.postman_collection.json'),
            environment: require('./scmp-z.postman_environment.json'),
            reporters: 'cli'
        }, function (err) {
            if (err) { done(err)}
            console.log('new api run complete!');
            done();
        });
    });


})