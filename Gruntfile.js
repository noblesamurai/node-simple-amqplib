module.exports = function(grunt) {

  grunt.initConfig({
    env: {
      test: {
        AMQP_URL: 'amqp://guest:guest@localhost',
        AMQP_EXCHANGE: 'samuraicloud',
        AMQP_CONSUME_QUEUE: 'consume_queue',
        AMQP_PUBLISH_QUEUE: 'publish_queue',
        AMQP_PUBLISH_QUEUE_ROUTING_KEY: 'snapshot_to_gs',
      }
    },
    jshint: {
      all: ['Gruntfile.js', 'lib/**/*.js', 'test/**/*.js']
    },
    mochacli: {
      all: ['test/**/*.js'],
      options: {
        reporter: 'mocha-unfunk-reporter',
        ui: 'tdd'
      }
    },
    watch: {
      files: ['*.js', 'lib/**/*.js', 'test/**/*.js'],
      tasks: 'test'
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-cli');
  grunt.loadNpmTasks('grunt-env');
  grunt.loadNpmTasks('grunt-exec');
  grunt.registerTask('test', ['env:test', 'mochacli']);
  grunt.registerTask('dev', ['env:dev', 'exec:dev']);
  grunt.registerTask('prod', ['env:prod', 'exec:dev']);
};
