var glob = require("glob"),
    scraper = require("./lib/scraper"),
    Spider = require("./lib/spider").Spider;


var INDEX = 'http://ubuntuforums.org/archive/index.php';

function init() {
    var s = new Spider([INDEX], 3, scraper.processors);
    glob.glob("output/*/*.json", function(er, files) {
        for (var i=0; i<files.length; i++) {
            var file = files[i],
                threadId = /output\/\d+\/(\d+).json$/.exec(file)[1];
            s.seen["http://ubuntuforums.org/archive/index.php/t-" + threadId + ".html"] = true;
        }
        s.start();
    });
}

init();
