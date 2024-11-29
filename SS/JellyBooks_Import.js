/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/email', 'N/runtime', 'N/https', 'N/file'],
    function(search, record, email, runtime, https, file) {
        function execute(context) {

        function retry(expectedErrors, task, retries=1) {
             try {
            return task();
             } catch (err) {
            if (retries === 0) throw err;
            if (expectedErrors.length && !expectedErrors.includes(err.name)) throw err;
            return retry(expectedErrors, task, --retries);
             }
        }



        const jbApiKey = runtime.getCurrentScript().getParameter('custscript_ps_jb_key')  

        var jbHeaders ={
           accept: 'application/json'
        };

        var jbUrl = 'https://www.jellybooks.com/discovery/api/excerpts?jb_discovery_api_key=' + jbApiKey
        log.audit('DOWNLOAD', 'Starting download...')

        var jbResponse


        retry(["SSS_REQUEST_TIME_EXCEEDED"], function() {

                jbResponse = https.get({
                url: jbUrl,
                headers: jbHeaders
                })

        });



        log.debug('DOWNLOAD', 'Download Complete, parsing...')

 
        var jbExcerpts = []

        var jbExcerpts = JSON.parse(jbResponse.body)
        var excerptsCount = jbExcerpts.excerpts.length
        log.debug('EXCERPTS', excerptsCount + ' excerpts downloaded! Extracting all ISBNs...')


        var columns = [search.createColumn({name: "internalid", label: "Internal ID"}),search.createColumn({name: "custitem_sp_isbn", label: "ISBN"})]
        var filters = [["isonline","is","T"],"AND",["custitem_ps_jellybooks_url","isempty",""]]
        var itemSearchObj = search.create({
           type: "item",
           filters: filters,
           columns: columns 
        });

        var searchResultCount = itemSearchObj.runPaged().count;

        log.debug('ISBN SEARCH', 'Search returned ' + searchResultCount + ' items')

        var isbnList = [];

        var searchObj = itemSearchObj.runPaged({
        pageSize:1000
        });
        searchObj.pageRanges.forEach(function (pageRange) {
            searchObj.fetch({
                index:pageRange.index
            })
            .data.forEach(function (result) {
                isbnList.push({itemId:result.getValue(columns[0]),isbn:result.getValue(columns[1])});
             });
        });




        for (var i = 0; i < isbnList.length; i++) {

            var excerptMatch = jbExcerpts.excerpts.find(excerpt => excerpt.isbn13===isbnList[i].isbn)

            if (!!excerptMatch){

                  log.audit('MATCH','Match found for ISBN ' + isbnList[i].isbn)
                    try {
                        record.submitFields({
                            type: record.Type.INVENTORY_ITEM,
                            id: isbnList[i].itemId,
                            values: {
                                'custitem_ps_jellybooks_url': excerptMatch.url
                            }

                        })
                    log.audit('UPDATED', 'Updated product ' + isbnList[i].itemId + ' with URL ' + excerptMatch.url)
                    } catch (e) {
                        log.error({
                            title: e.name,
                            details: e.message      
                        });
                     }

            }

        }
        

        log.audit("COMPLETE")

    }



        return {
            execute: execute
        };
    }); 

