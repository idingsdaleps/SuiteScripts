/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/email', 'N/runtime', 'N/https', 'N/file', 'N/encode', 'N/task'],
    function(search, record, email, runtime, https, file, encode, task) {
        function execute(context) {
            try{
            log.debug('SCRIPT START')

           const genesysEnvironment = runtime.getCurrentScript().getParameter('custscript_genesys_env');
           const genesysClientID = runtime.getCurrentScript().getParameter('custscript_genesys_cid');
           const genesysClientSecret = runtime.getCurrentScript().getParameter('custscript_genesys_secret'); 
           const genesysContactListID = runtime.getCurrentScript().getParameter('custscript_genesys_listid');
           const genesysSearchID = runtime.getCurrentScript().getParameter('custscript_genesys_search');         
           const genesysFileID = runtime.getCurrentScript().getParameter('custscript_genesys_file');         


           function genesysAuth(){
            var authString = genesysClientID + ':' + genesysClientSecret
            var authBase64= encode.convert({
            string: authString,
            inputEncoding: encode.Encoding.UTF_8,
            outputEncoding: encode.Encoding.BASE_64
            }); 

            var authHeaders ={
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + authBase64
             };

  

            var authURL = 'https://login.' + genesysEnvironment + '/oauth/token'

            var authResponse = https.post({
            url: authURL,
            body: encodeURI('grant_type=client_credentials'),
            headers: authHeaders
            });


           log.debug('AUTH RESPONSE CODE', authResponse.code)

            return authResponse.body

           }




        var genesysResponse = JSON.parse(genesysAuth());
        var genesysToken = genesysResponse.access_token;
        var tokenType = genesysResponse.token_type;

        if(!!tokenType){

        log.debug('TOKEN', 'Using ' + tokenType + ' token')
        var clearContactListURL = 'https://api.' + genesysEnvironment + '/api/v2/outbound/contactlists/' + genesysContactListID + '/clear'

        var requestHeaders ={
        'accept' : 'application/json',
        'Content-Type': 'application/json',
        'Authorization': tokenType + ' ' + genesysToken
         };

        var clearResponse = https.post({
        url: clearContactListURL,
        headers: requestHeaders
        });

        log.debug ('CONTACT LIST CLEAR', clearResponse.code)

        if (clearResponse.code==202){



            log.audit('RUNNING SEARCH')

            var searchTask = task.create({
                taskType: task.TaskType.SEARCH
                });
            searchTask.savedSearchId = genesysSearchID;
            searchTask.fileId = genesysFileID;
            var searchTaskId = searchTask.submit();
            }

            log.audit('SEARCH COMPLETE')


            log.audit('20S WAIT...')

            var clearResponse = https.get({
            url: 'https://flash.siwalik.in/delay/20000/url/www.google.com'
            });

            log.audit('START CONTACT UPLOAD')

            var uploadHeaders ={
            'accept' : 'application/json',
            'Content-Type': 'multipart/form-data; boundary=WebKitFormBoundary7MA4YWxkTrZu0gW',
            'Authorization': tokenType + ' ' + genesysToken
             };

            var uploadURL = 'https://apps.' + genesysEnvironment + '/uploads/v2/contactlist'

            var contactFile = file.load({id: genesysFileID});
            var contactFileContents = contactFile.getContents();

            var body = []
            var boundary = 'WebKitFormBoundary7MA4YWxkTrZu0gW'
            body.push('--' + boundary);
            body.push('Content-Disposition: form-data; name="id"');
            body.push('');
            body.push(genesysContactListID);
            body.push('--' + boundary);
            body.push('Content-Disposition: form-data; name="fileType"');
            body.push('');
            body.push('contactList');
            body.push('--' + boundary);
            body.push('Content-Disposition: form-data; name="contact-id-name"');
            body.push('');
            body.push('Internal ID');
            body.push('--' + boundary);
            body.push('Content-Disposition: form-data; name="file"; filename="GenesysContacts.csv"');
            body.push('');
            body.push(contactFileContents);
            body.push('--' + boundary + '--');

            log.debug('HEADERS', uploadHeaders)

            var uploadResponse = https.post({
            url: uploadURL,
            headers: uploadHeaders,
            body: body.join('\r\n'),
            });


            log.debug('UPLOAD RESPONSE', uploadResponse)

        }


        }catch (e){log.debug('ERROR', e.message)}

      


    }



        return {
            execute: execute
        };
    }); 

