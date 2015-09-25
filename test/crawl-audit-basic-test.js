var assert    = require("assert");
var _         = require("underscore");
var seoaudit  = require("../plugins/audit-plugin.js");
var logger    = require("../plugins/log-plugin.js");

var testSite  = require("./website/start.js").site;

var crawler = require("../index.js");


describe('Audit Plugin Basic tests', function() {


        it('Should return an error for an invalid site', function(done) {

            var c = new crawler.Crawler();
            var audit = new seoaudit.Plugin();
            c.registerPlugin(audit);

            c.on("end", function(){

                assert(audit.errors.length == 1);
                done();

            });

            c.queue({url : "http://test:1234"});

        });

        it('Should return the redirect info for 301', function(done) {

            var c = new crawler.Crawler();
            var audit = new seoaudit.Plugin();
            c.registerPlugin(audit);

            c.on("end", function(){

                var resource = audit.resources.get("http://localhost:9999/redirect");
                assert(resource.statusCode==301);
                var pageDest = audit.outLinks.get("http://localhost:9999/redirect")[0].page;
                assert( pageDest == "/page2.html", "invalide destination page for the redirect : " + pageDest );

                done();

            });

            c.queue({url : "http://localhost:9999/redirect"});

        });

        it('Should return the redirect chain info for a series of 301', function(done) {

            var c = new crawler.Crawler();
            var audit = new seoaudit.Plugin();
            c.registerPlugin(audit);
            //var log = new logger.Plugin(c);

            c.on("end", function(){


                var resource = audit.resources.get("http://localhost:9999/redirect1");
                assert(resource.statusCode==301);

                resource = audit.resources.get("http://localhost:9999/redirect2");
                assert(resource.statusCode==302);
                assert(audit.redirects.get("http://localhost:9999/redirect1").to == "http://localhost:9999/redirect2");
                assert(audit.redirects.get("http://localhost:9999/redirect1").statusCode == 301);
                assert(audit.redirects.get("http://localhost:9999/redirect2").to == "http://localhost:9999/redirect3");
                assert(audit.redirects.get("http://localhost:9999/redirect2").statusCode == 302);
                assert(audit.redirects.get("http://localhost:9999/redirect3").to == "http://localhost:9999/index.html");
                assert(audit.redirects.get("http://localhost:9999/redirect3").statusCode == 301);
                done();

            });

            c.queue({url : "http://localhost:9999/redirect1"});

        });

        it('Should return only the latest url after a 301 chain with the option followRedirect = true', function(done) {

            var c = new crawler.Crawler({followRedirect : true});
            var audit = new seoaudit.Plugin();
            c.registerPlugin(audit);

            c.on("end", function(){

                var resource = audit.resources.get("http://localhost:9999/index.html");
                assert(resource.statusCode==200);

                assert(audit.redirects.keys = []);

                done();

            });

            c.queue({url : "http://localhost:9999/redirect1"});

        });

        it('Should crawl images', function(done) {

            var c = new crawler.Crawler();
            var audit = new seoaudit.Plugin();
            //var log = new logger.Plugin();
            c.registerPlugin(audit);
            //c.registerPlugin(log);

            c.on("end", function(){
                //console.log("Unit test : end");
                var resource = audit.resources.get("http://localhost:9999/200x200-image.jpg");
                assert(resource.contentType =='image/jpeg');

                done();

            });

            c.queue({url : "http://localhost:9999/page1.html"});

        });

        it('Should crawl 404 urls', function(done) {

            var c = new crawler.Crawler();
            var audit = new seoaudit.Plugin();
            c.registerPlugin(audit);

            c.on("end", function(){

                var resource = audit.resources.get("http://localhost:9999/404-test.html");

                assert(resource.statusCode==404);
                assert(audit.outLinks.get("http://localhost:9999/page3.html")[0].page == "http://localhost:9999/404-test.html");
                assert(audit.inLinks.get("http://localhost:9999/404-test.html")[0].page == "http://localhost:9999/page3.html");

                done();

            });

            c.queue({url : "http://localhost:9999/page3.html"});

        });


        it('Should crawl 500 urls', function(done) {

            var c = new crawler.Crawler();
            var audit = new seoaudit.Plugin();
            c.registerPlugin(audit);

            c.on("end", function(){

                var resource = audit.resources.get("http://localhost:9999/internal-error");

                assert(resource.statusCode==500);
                assert(audit.outLinks.get("http://localhost:9999/page3.html")[1].page == "http://localhost:9999/internal-error");
                assert(audit.inLinks.get("http://localhost:9999/internal-error")[0].page == "http://localhost:9999/page3.html");

                done();

            });

            c.queue({url : "http://localhost:9999/page3.html"});

        });


        it('Should crawl even with timout', function(done) {
            this.timeout(5000);
            var c = new crawler.Crawler({timeout: 50, maxErrors:-1, retries:1, retryTimeout:5 });
            var audit = new seoaudit.Plugin();
            c.registerPlugin(audit);

            c.on("end", function(){

                var resource = audit.resources.get("http://localhost:9999/timeout");
                //console.log(audit.resources.get("http://localhost:9999/timeout"));
                assert(resource.statusCode == 408);
                assert(audit.outLinks.get("http://localhost:9999/page4.html")[0].page == "http://localhost:9999/timeout");
                assert(audit.outLinks.get("http://localhost:9999/page4.html")[1].page == "http://localhost:9999/");
                assert(audit.inLinks.get("http://localhost:9999/timeout")[0].page == "http://localhost:9999/page4.html");

                done();

            });

            c.queue({url : "http://localhost:9999/page4.html"});
            //c.queue({url : "http://localhost:9999/timeout"});

        });

        it('Should crawl even with timout with retries', function(done) {
            this.timeout(10000);
            var c = new crawler.Crawler({timeout: 50, retries : 3, retryTimeout : 500});
            var audit = new seoaudit.Plugin();
            c.registerPlugin(audit);

            c.on("end", function(){

                var resource = audit.resources.get("http://localhost:9999/timeout");

                assert(resource.statusCode==408);
                assert(audit.outLinks.get("http://localhost:9999/page4.html")[0].page == "http://localhost:9999/timeout");
                assert(audit.outLinks.get("http://localhost:9999/page4.html")[1].page == "http://localhost:9999/");
                assert(audit.inLinks.get("http://localhost:9999/timeout")[0].page == "http://localhost:9999/page4.html");

                done();

            });

            c.queue({url : "http://localhost:9999/page4.html"});

        });

        /*
        it.only('Should stop to crawl the site if there are too many errors', function(done) {
            this.timeout(60000);
            var c = new crawler.Crawler({skipDuplicates : false, maxConnections: 2, timeout: 50, maxErrors : 3, retries : 2, retryTimeout:200});
            var audit = new seoaudit.Plugin(c);
            var log = new logger.Plugin(c);

            c.on("end", function(){

                console.log(audit.errors.toArray());

                done();

            });

            c.queue({url : "http://localhost:9999/page11.html"});

        });
        */


        it('Should crawl even with dns error', function(done) {

            var c = new crawler.Crawler({externalDomains : true});
            var audit = new seoaudit.Plugin();
            c.registerPlugin(audit);

            c.on("end", function(){

                var resource = audit.resources.get("http://www.thisnotcorrect.abc/");

                assert(resource.statusCode=="DNS lookup failed");


                assert(audit.outLinks.get("http://localhost:9999/page5.html")[0].page == "http://www.thisnotcorrect.abc/");
                assert(audit.outLinks.get("http://localhost:9999/page5.html")[1].page == "http://localhost:9999/");
                assert(audit.inLinks.get("http://www.thisnotcorrect.abc/")[0].page == "http://localhost:9999/page5.html");

                done();

            });

            c.queue({url : "http://localhost:9999/page5.html"});

        });

        /*
        it('Should crawl with a rate limit ', function(done) {

            this.timeout(20000);
            var c = new crawler.Crawler({rateLimits:500});
            var audit = new seoaudit.Plugin(c);
            var log = new logger.Plugin(c);

            c.on("end", function() {

                assert(audit.resources.keys().length == 16);
                done();

            });

            c.queue({url : "http://localhost:9991/index.html"});

        });
        */




});
