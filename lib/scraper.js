var cheerio = require("cheerio"),
    config = require("config"),
    url = require("url"),
    iconv  = require('iconv-lite'),
    fs = require('fs');


function index(spider, url, error, resp, html) {
    var $ = cheerio.load(iconv.decode(html, 'iso-8859-1').toString('utf-8')),
        forums = config.get("forums");
    $("li > a").each(function(i, el) {
        var $el = $(el),
            text = $el.text(),
            link = $el.attr("href");
        if (!forums[text]) {
            return;
        }
        if (!link) {
            return;
        }
        spider.enqueue(removeSession(link));
    });
}

function forum(spider, url, error, resp, html) {
    var $ = cheerio.load(iconv.decode(html, 'iso-8859-1').toString('utf-8'));
    // enqueue page numbers
    $("#pagenumbers > a").each(function(i, el) {
        spider.enqueue(removeSession($(el).attr("href")));
    });
    // enqueue content
    $("#content > ol > li > a").each(function(i, el) {
        spider.enqueue(removeSession($(el).attr("href")));
    });
}


function thread(spider, url, error, resp, html) {
    var $ = cheerio.load(iconv.decode(html, 'iso-8859-1').toString('utf-8')),
        forumLink = $("#navbar").children("a").last(),
        titleLink = $("p.largefont > a").first(),
        res = {
            "forum_name": forumLink.text(),
            "forum_link": removeSession(forumLink.attr("href")),
            "title": titleLink.text(),
            "link": url,
            "posts": []
        };

    if (!res.forum_link) {
        return;
    }

    var forumId = /\d+/.exec(res.forum_link)[0],
        threadId = /\d+/.exec(url)[0];

    $(".post").each(function(i, el) {
       var $post = $(el),
           username = $post.children(".posttop").children(".username").text(),
           date = $post.children(".posttop").children(".date").text(),
           text = $post.children(".posttext").text();
        res.posts.push({
            "username": username,
            "date": date,
            "text": text
        });
    });

    // start saving
    if (!fs.existsSync("output")) {
        fs.mkdirSync("output");
    }

    if (!fs.existsSync("output/" + forumId)) {
        fs.mkdirSync("output/" + forumId);
    }

    fs.writeFile("output/" + forumId + "/" + threadId + ".json", JSON.stringify(res));
}


function removeSession(link) {
    if (!link) {
        return link;
    }
    var parsed = url.parse(link, true);
    delete parsed.query.s;
    delete parsed.search;
    return url.format(parsed);
}


exports.processors = [
    {regexp: new RegExp("/archive/index\\.php$"), func: index},
    {regexp: new RegExp("/archive/index\\.php/f-\\d+(-p-\\d+)?\\.html$"), func: forum},
    {regexp: new RegExp("/archive/index\\.php/t-\\d+.html$"), func: thread}
];
