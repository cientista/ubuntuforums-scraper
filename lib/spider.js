var request = require("request");

/**
 * Spider
 *
 * Starts its work by downloading urls from the list using as many as numThreads and applying processors to them.
 *
 * Processors represent the list of objects, containing rules to see if URL matches the processor, and the processing
 * function itself. Something like:
 *
 * [
 *      {"regexp": /foo/, "func": function(spider, url, error, resp, html) {...}}
 * ]
 *
 */
function Spider(urls, numThreads, processors) {
    this.urls = urls.slice();
    this.numThreads = numThreads;
    this.processors = processors;
    this.activeThreads = 0;
    this.seen = {};
}

/**
 * Download the contents of urls, applying `processor` to every downloaded page. Have no more than `numThread`
 * downloading processes
 */
Spider.prototype.start = function() {
    for (var th=this.activeThreads; th < this.numThreads; th++) {
        this.startThread();
    }
};


/**
 * Enqueue URL for scraping
 */
Spider.prototype.enqueue = function(url) {
    if (!url) {
        return;
    }
    console.log("Enqueue " + url);
    this.urls.push(url);
};

/**
 * Return next element to scrape
 */
Spider.prototype.next = function() {
    while (true) {
        var url = this.urls.pop();
        if (!url) {
            return null;
        }
        if (this.seen[url] === undefined) {
            this.seen[url] = true;
            return url;
        }
    }
};


/**
 * Internal function to start a single thread. Thread itself takes next URL from the list,
 * downloads it and as it's done, restarts the spider again.
 */
Spider.prototype.startThread = function() {
    // stop the thread immediately if we're done
    var url = this.next();
    if (!url) {
        return;
    }

    // XXX: what happens on failure?
    var spider = this;
    spider.activeThreads += 1;
    console.log(url + " started");
    request.get({url: url, encoding: null}, function(error, resp, html) {
        if (error || resp.statusCode != 200 || !html) {
            console.log("WARNING: unable to download " + url);

        } else {
            console.log(url + " done");
            var processor = spider.matchProcessor(url);
            processor(spider, url, error, resp, html);
        }
        spider.activeThreads -= 1;
        spider.start();
    });
};


/**
 * Internal function to match url with its processor
 */
Spider.prototype.matchProcessor = function(url) {
    // search for processor
    for (var i=0; i<this.processors.length; i++) {
        var p = this.processors[i];
        if (p.regexp.test(url)) {
            return p.func;
        }
    }
    // default NOP processor
    return function() {
        console.log("WARNING: not found processor for " + url);
    };
};


exports.Spider = Spider;
