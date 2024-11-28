/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/email', 'N/runtime', 'N/https', 'N/file'],
    function(search, record, email, runtime, https, file) {
        function execute(context) {
        const jbApiKey = runtime.getCurrentScript().getParameter('custscript_ps_jb_key')  

        var jbHeaders ={
           accept: 'application/json'
        };

        var jbUrl = 'https://www.jellybooks.com/discovery/api/excerpts?jb_discovery_api_key=' + jbApiKey
        log.debug('DOWNLOAD', 'Starting download...')

        var jbResponse = https.get({
            url: jbUrl,
            headers: jbHeaders
        })

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


        console.log("TEST INDEX", )



/*
        for (var i = 0; i < isbnList.length; i++) {

            log.debug('INDEX OF ' + isbnList[i].isbn, jbExcerpts.excerpts.indexOf(isbnList[i].isbn))

           if (jbExcerpts.excerpts.indexOf(isbnList[i].isbn)!=-1){        

                log.debug('Match found for ISBN ' + isbnList[i].isbn)

            }

        }
        
*/
    }



        return {
            execute: execute
        };
    }); 

