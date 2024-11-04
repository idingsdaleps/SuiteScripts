/**
 * Name			: nbs272_dispatch_note_mr.js
 * Property of 	: NoBlue
 * Customer 	: Sandpiper Books
 * Type			: Map/reduce script executed by nbs272_dispatch_note_ss.js script
 * Comments		: creates the Despatch Notes 
 * Notes		:				  
 * 
 * Version		Date            	Author      	Remarks
 * 1.0       	28/09/2017     		NoBlue(AC)		Initial development
 * 1.1			07/09/2018			NoBlue(BO)		Improvements
 * 1.2			24/09/2018			NoBlue(BO)		Improvements to script and the nbs272_dispatch_note.xml 
 * 2.0			02/01/2019			NoBlue(AS)		updated nbs272_dispatch_note.xml to fix issue with ticket 81496
 * 2.1			17/01/2019			NoBlue(BO)		fixed the issue with payment method
 * 2.2			06/02/2019			NoBlue(AS)		remove the existing file before writing the new file (ticket 81518)
 * 2.3			21/06/2019			NoBlue(BO)		adding kits components (ticket 90208)		 
 * 2.4			19/03/2020			NoBlue(KD)		fix kits components ampersand issue (ticket 103334)	
 * 2.5			09/02/2021			NoBlue(AB)		Add ship item displayname for shipmethod to data object and remove Z- prefix from payment method
 * 2.6			14/07/2022			NoBlue(KD) 		Ticket 156731 - Add Amazon.co.uk customers to standard image recipient list, even when new
 */


/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/log', 'N/record', 'N/runtime', 'N/render', 'N/file', 'N/config', 'N/task'],

		function(search, log, record, runtime, render, file, config, task) {

	var recordtypes={
			"InvtPart":"inventoryitem",
			"Group":"itemgroup", 	
			"NonInvtPart":"noninventoryitem",
			"Discount":"discountitem",
			"Description":"descriptionitem",
			"DwnLdItem":"downloaditem",
			"GiftCert":"giftcertificateitem",
			"Kit":"kititem",
			"Assembly":"lotnumberedassemblyitem",
			"Markup":"markupitem",
			"OthCharge":"otherchargeitem",
			"Payment":"paymentitem",
			"Assembly":"serializedassemblyitem",
			"Service":"serviceitem",
			"ShipItem":"shipitem",
			"Subtotal":"subtotalitem"};

	function getInputData() {
		try{
			var filters = [];

			filters[0] = search.createFilter({name: 'custbody_nbs_generatedispatchnote', operator: 'is', values:'T'});
			filters[1] = search.createFilter({name: 'mainline', operator: 'is', values:'T'});

			var columns = [];
			columns[0] =  new search.createColumn({name:'internalid'});

			var salesorderSearch = search.create({
				type: 'salesorder',
				filters: filters,
				columns: columns});

		}catch(e){
			log.error({
				title: 'Error', 
				details: JSON.stringify(e)
			});
		}

		return salesorderSearch;
	}

	function map(context) {
		var result = JSON.parse(context.value);

		try{
			log.debug({
				title: result.id, 
				details: 'Generating...'
			});
			generateDispatchNote(result.id);
			log.debug({
				title: result.id, 
				details: 'Done!'
			});
			context.write(result.id, 'OK');
		}catch(e){
			if(e.name == 'RCRD_HAS_BEEN_CHANGED'){
				context.write(result.id, 'CHANGED');
			}
			log.error({
				title: 'Error', 
				details: JSON.stringify(e)
			});
		}
	}


	/**
	 * Executes when the summarize entry point is triggered and applies to the result set.
	 *
	 * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
	 * @since 2015.1
	 */
	function summarize(summary) {
		var values = [];
		summary.output.iterator().each(function(salesOrderId, value) {
			values.push(value);
			return true;
		});
		if(values.length>0){
			log.debug({
				title: 'Rescheduling', 
				details: JSON.stringify(values)
			});
			reschedule();
		}

	}

	function generateDispatchNote(soRecordId) {

		var soRecord = record.load({type:record.Type.SALES_ORDER, id:soRecordId});

		//skip orders with over 10 lines
//		var itemCount = soRecord.getLineCount({
//		sublistId: 'item'
//		});

//		if (itemCount > 10){
//		log.debug({
//		title: result.id, 
//		details: 'skipping (nr lines = ' + itemCount + ' )'
//		});
//		return;
//		}

		var scriptObj = runtime.getCurrentScript();

		var renderer = renderDispatchNote(soRecord, scriptObj);
		var pdf = renderer.renderAsPdf();

		var fileObj = getFile(soRecord, scriptObj);
		var existingfileId = soRecord.getValue({fieldId:'custbody_nbs_deliverynotefile'});		//2.2

		pdf.folder = fileObj.folder;
		pdf.name = fileObj.name;
		pdf.isOnline = true;

		//2.2
		if(!!existingfileId)
		{
			var deletedFileId = file.delete({
				id: existingfileId
			});

			log.audit('deteledFileId',deletedFileId);
		}

		var fileId = pdf.save();

		var auxUrl = null;
		//3.2
		var fileObj =  file.load({id:fileId});
		auxUrl = fileObj.url;

		//3.2 - as the old file will be deleted, no need of checking the url
		/* if(!!fileObj.url)
        	auxUrl = fileObj.url;
        else{
        	fileObj = file.load({id:fileId});
        	auxUrl = fileObj.url;
        }*/

		record.submitFields({
			type: record.Type.SALES_ORDER,
			id: soRecord.id,
			values: {
				custbody_nbs_deliverynotefile: fileId,
				custbody_nbs_deliverynoteurl: auxUrl,
				custbody_nbs_generatedispatchnote: false
			},
			options: {
				enableSourcing: false,
				ignoreMandatoryFields : true,
				disableTriggers: true
			}
		});
	}


	function renderDispatchNote(soRecord, scriptObj){
		var renderer = render.create();

		var template = getTemplate(scriptObj);
		renderer.templateContent = template.getContents();

		var currency = soRecord.getValue('currencysymbol');
		currency = ' ' + currency + ' ';
		var customer = record.load({type: record.Type.CUSTOMER, id:soRecord.getValue({fieldId:'entity'})});
      
		var shipmethod = soRecord.getValue({fieldId: "shipmethod"});
        if(shipmethod != ""){
			var shipItem = record.load({type: "shipItem", id: shipmethod});
          	var shipItemDisplayName = shipItem.getText({fieldId:"displayname"});
        }
		var shipItem = record.load({type: "shipItem", id: shipmethod});
		var data = {marketingImg: marketingImage(soRecord), 
				hidePrices:'F', 
				logo : 'https://system.eu2.netsuite.com/core/media/media.nl?id=129&c=4480225&h=eac990dc27a958a29f7a',
				shipmethod : soRecord.getText('shipmethod'),
                shipmethod_displayname : shipItemDisplayName || ""
   
        };
		var MCHidePrices = scriptObj.getParameter({name: 'custscript_nbs272_hide_price_media_codes'});
		if(!!MCHidePrices){
			var mediaCode = soRecord.getValue({fieldId:'leadsource'});
			if(MCHidePrices.split(',').indexOf(mediaCode) != -1){
				data.hidePrices = 'T';
			}
		}
		log.debug({
			title: 'data', 
			details: data
		});
		var giftOrder = soRecord.getValue({fieldId:'custbody_nbs_giftorder'});
		if(!!giftOrder) data.hidePrices = 'T';


		renderer.addCustomDataSource({
			format: render.DataSource.OBJECT,
			alias: "data",
			data: data
		});

		var companyInformation = config.load({type: config.Type.COMPANY_INFORMATION});
		renderer.addRecord({templateName:'record', record:soRecord});
		renderer.addRecord({templateName:'entity', record:customer});
		renderer.addRecord({templateName:'companyInformation', record:companyInformation});

		var lines = [];
		var lostLines = [];
		var itemCount = soRecord.getLineCount({
			sublistId: 'item'
		});
		/*We add a custom data array with the lines we will need to show in the report*/
		var fields = ['custcol_nbs_itemproductcode', 'quantity', 'custcol_nbs_quantitylost', 'description', 'rate', 'amount', 'grossamt', 'custcol_nbs_itemdisplaynamecode', 'custcol_nbs_itemcondition'];
		for (var i = 0; i < itemCount; i++){

			var line = {description:''};
			for(f in fields){
				line[fields[f]] = soRecord.getSublistValue({
					sublistId: 'item',
					fieldId: fields[f],
					line: i
				});  
			}
			if(!!line['custcol_nbs_itemdisplaynamecode'])
				line['description'] = line['custcol_nbs_itemdisplaynamecode'];

			if(!!line['description'])
				line['description'] = line['description'].replace(new RegExp('&', 'g'), '&amp;');

			//2.3 add component items for kits in description
			var itemType = soRecord.getSublistValue({
				sublistId: 'item',
				fieldId: 'itemtype',
				line: i
			});

			var kitComponentsString = soRecord.getSublistValue({
				sublistId: 'item',
				fieldId: 'custcol_nbs272_kitcomponents',
				line: i
			});

			log.debug('kitComponentsString', 'Line ' + i + ', ' + kitComponentsString);

			//Get the components if they're empty

			if(!(!!kitComponentsString) && itemType == "Kit"){
				
				var components = "";
				
				var kitRec = record.load({type: 'kititem', id: soRecord.getSublistValue({sublistId: 'item', fieldId: 'item',line: i}) });

				for (var j = 0; j < kitRec.getLineCount({sublistId: 'member'}); j++){
					
					var itemDisplay = kitRec.getSublistValue({sublistId: 'member',fieldId: 'memberdescr', line: j});

					if (itemDisplay){
						
						components += itemDisplay;
						
					}else{
						
						components += kitRec.getSublistText({sublistId: 'member',fieldId: 'item', line: j});
						
					}

					if (j < kitRec.getLineCount({sublistId: 'member'})){
						
						components += '^';
						
					}
				}
				
				log.debug('components',components);
				kitComponentsString = components;
				
				log.debug('kitComponentsString-2', 'Line ' + i + ', ' + kitComponentsString + '. ' );
			}

			


			if (itemType == "Kit" && kitComponentsString){
				//var kitComponents = kitComponentsString.split('^');

				line['kitComponents'] = kitComponentsString;
              	line['kitComponents'] = line['kitComponents'].replace(new RegExp('&', 'g'), '&amp;');

//				if (kitComponents && kitComponents.length > 0){
//				line['description'] += "^^KitComponents^^";
//				line['description'] += "<br/>";
//				for (var j=0; j< kitComponents.length ; j++){

//				line['description'] += "&nbsp;&nbsp;&nbsp;&nbsp;";
//				line['description'] += kitComponents[j].trim() + "<br/>";
//				}
//				}



			}

			//1. Items without lost sales
			if(!!line.quantity)	
				lines.push(line);
			if(!!line.custcol_nbs_quantitylost){
				//2. Items with lost sales
				var lostLine = JSON.parse(JSON.stringify(line));
				lostLine.quantity = Number(line.custcol_nbs_quantitylost);
				lostLine.amount = '';
				// fix lost line amount when an item is partially shipped
				lostLine.grossamt = 0;
				//
				lostLines.push(lostLine);
			}
		}
		lines.sort(sortFunction);
		//3. Lost sales
		if(lostLines.length>0){
			lines.push({description:''});//Blank line
			lines.push({description:''});//Blank line
			var description = 'Unfortunately the following item(s) were out of stock when we processed';
			var line = {description:description};
			lines.push(line);
			var description = 'your order:';
			var line = {description:description};
			lines.push(line);
		}
		lostLines.sort(sortFunction);

		lines = lines.concat(lostLines);

		var paymentmethod2 = soRecord.getText({fieldId:'custbody_nbs_paymentmethod2'});
		paymentmethod2 = paymentmethod2.replace('&','and');		//2.1
		var newbalance = soRecord.getValue({fieldId:'custbody_nbs_newbalance'});

		newbalance = Number(newbalance);
		if(!!paymentmethod2 && newbalance <-1 && !(!!giftOrder)){
			description = 'We have processed your '+paymentmethod2.toLowerCase()+' and you have '+currency+Math.abs(newbalance).toFixed(2)+' credit on your account.';
			line = {description:description};
			lines.push(line);
		}

		//4. Underpaid
		if(paymentmethod2 && newbalance>1 && !(!!giftOrder)){
			lines.push({description:''});//Blank line
			line = {description:'Please note you have underpaid by '+currency+newbalance.toFixed(2)+ '.'};
			lines.push(line);

			line = {description:'Please call Customer Services on +44(0)1626 897 123 to make payment.'};
			lines.push(line);
		}

		//5. Gift text line
		var giftMessage = soRecord.getValue({fieldId:'custbody_nbs_giftmessage'}).replace(new RegExp('&', 'g'), '&amp;');
		if(!!giftOrder && !!giftMessage && giftMessage.length>0){
			lines.push({description:''});
			lines.push({description:'** GIFT MESSAGE **<br/>'+giftMessage});
		}


		if(!(!!giftOrder)){
			//6. Payment method
			var individualForm = scriptObj.getParameter({name: 'custscript_nbs272_individual_form'});

			var paymentmethod2 = soRecord.getValue({fieldId:'custbody_nbs_paymentmethod2'});
			var paymentmethod = soRecord.getValue({fieldId:'paymentmethod'});
			var terms = soRecord.getValue({fieldId:'terms'});
			var customForm = soRecord.getValue('customform');
			var auxPaymentMethod = '';
			if(customForm == individualForm){
				if(!!paymentmethod2) 
					auxPaymentMethod = soRecord.getText({fieldId:'custbody_nbs_paymentmethod2'});
				if(!(!!auxPaymentMethod) && !!paymentmethod)
					auxPaymentMethod = soRecord.getText({fieldId:'paymentmethod'});
			}else{
				if(!!terms) 
					auxPaymentMethod = soRecord.getText({fieldId:'terms'});
				if(!(!!auxPaymentMethod) && !!paymentmethod)
					auxPaymentMethod = soRecord.getText({fieldId:'paymentmethod'});
			}
			if(!!auxPaymentMethod)
				//2.1
//				log.debug({
//				title: auxPaymentMethod, 
//				details: 'auxPaymentMethod...before'
//				});
				var newAuxPaymentMethod = auxPaymentMethod.replace('&','and');
			//lines.push({description: 'Paid by: ' + newAuxPaymentMethod});
          	lines.push({description: 'Paid by: via ' + newAuxPaymentMethod});

//			log.debug({
//			title: newAuxPaymentMethod, 
//			details: 'auxPaymentMethod...after'
//			});
		}

		var replacement = soRecord.getText({fieldId:'custbody_nbs_replacement'});
		if(!!replacement && replacement == 'T')
			lines.push({description: 'Replacement Order'});
		log.debug({
			title: 'lines', 
			details: lines
		});
		renderer.addCustomDataSource({
			format: render.DataSource.OBJECT,
			alias: 'items',
			data: {item:lines}
		});

		return renderer;
	}

	function marketingImage(salesOrder){
		var scriptObj = runtime.getCurrentScript();
		var customerId = salesOrder.getValue({fieldId:'entity'});
		var customerSearchObj = search.create({
			type: 'customer',
			filters: [['internalid', 'anyof', customerId]],
			columns: ['firstorderdate']
		});
		var firstOrder = false;

      log.debug({
			title: 'getting marketing image...', 
			details: 'getting marketing image...'
		});
      
      
		customerSearchObj.run().each(function(result){
			if(!(!!result.getValue('firstorderdate')) || result.getValue('firstorderdate') == salesOrder.getText({fieldId:'trandate'}))
				firstOrder = true;
			return true;
		});

      
       log.debug({
			title: 'firstOrder', 
			details: firstOrder
		});
      
      // TICKET 136228 - EXTRA LOGIC TO EXTRACT AND EXTRA IMAGE DEPENDING ON WHETHER THE LEAD SOURCE IS PAY-PER-CLICK
      
      var mediaCode = salesOrder.getValue({fieldId:'leadsource'});
      
       log.debug({
			title: 'mediaCode', 
			details: mediaCode
		});
      
       var shipCountry = salesOrder.getValue({fieldId:'shipcountry'});
       log.debug({
			title: 'shipcountry', 
			details: shipCountry
		});
      
      var columns = [];
	    	var mediagroup = 0;
	    	
	    	columns[0] = search.createColumn({
		    	  name: "custevent_nbs_mediagroup",
		    	 
	    	});
	    	
	    	var campaignSearchObj = search.create({
	    		type: 'campaign',
	    		filters: [['internalid', 'anyof', mediaCode]],
	    		columns: columns
	   		});
	   		campaignSearchObj.run().each(function(result){
	   			mediagroup = result.getValue(columns[0]);
	   		
               log.debug({
			title: 'mediagroup', 
			details: mediagroup
		});
              
              
	   			return true;
	   		});
      
      
      	if (firstOrder){
        	if(!!mediagroup && mediagroup == 1622 && shipCountry == 'GB'){
        		var imageName = scriptObj.getParameter({name:'custscript_nbs272_default_ppc_image_2'});
        	}
          // Ticket 156731 - Add Amazon.co.uk to standard image recipient, even when new
          else if(!!mediagroup && mediagroup == 1227)
            {
        		var imageName = scriptObj.getParameter({name:'custscript_nbs272_default_mketing_image'});   
        	}
        	else
            {
        		var imageName = scriptObj.getParameter({name:'custscript_nbs272_default_1st_order_img'});   
        	}
       	}
      	else
        {
        	var imageName = scriptObj.getParameter({name:'custscript_nbs272_default_mketing_image'});  
      	}

	//	var imageName = scriptObj.getParameter({name: firstOrder ? 'custscript_nbs272_default_1st_order_img' : 'custscript_nbs272_default_mketing_image'});
// TICKET 136228 - EXTRA LOGIC TO EXTRACT AND EXTRA IMAGE DEPENDING ON WHETHER THE LEAD SOURCE IS PAY-PER-CLICK
      
      
      var url = '';
      if (imageName != ""){
		var fileSearchObj = search.create({
			type: 'file',
			filters: [['name', 'is', imageName]],
			columns: ['url']
		});
      
		fileSearchObj.run().each(function(result){
			url = result.getValue('url');
			return true;
		});
      }
		url = url.length > 0 && url.indexOf("https") == -1 ? "https://system.eu2.netsuite.com" + url : url;
		return url.replace(new RegExp('&', 'g'), '&amp;');
	}

	function getTemplate(scriptObj){
		var bundleIds = scriptObj.bundleIds;
		var folder = '';

		if(!!bundleIds && bundleIds.length > 0)
			folder = 'SuiteBundles/Bundle ' + bundleIds[0];
		else
			folder = 'SuiteScripts/NBS272 Scripting';

		var path = folder + '/nbs272_dispatch_note.xml';
		log.audit('templatePath',path);
		var template = file.load({id: path});
		return template;
	}

	function getFile(soRecord, scriptObj){
		var fileId = soRecord.getValue({fieldId:'custbody_nbs_deliverynotefile'});
		var folderId = scriptObj.getParameter({name: 'custscript_nbs272_dispatch_notes_folder'});
		var fileObj = null;
		if(!!fileId){
			fileObj = file.load({id:fileId});
		}else{
			var fileName = 'DN_ORD_'+(new Date()).valueOf()+'_'+soRecord.getValue('entity')+'.pdf';
			fileObj = file.create({
				name: fileName,
				fileType: file.Type.PDF,
				contents: 'kk',
			});
		}
		fileObj.isOnline = true;
		fileObj.folder = folderId;
		return fileObj;
	}

	sortFunction = function(a, b){
		if(!!a.description && !!b.description){
			var nameA=a.description.toLowerCase(), nameB=b.description.toLowerCase();
			if (nameA < nameB) 
				return -1;
			if (nameA > nameB)
				return 1;
		}
		return 0;
	};

	function reschedule(){
		var scriptTask = task.create({taskType: task.TaskType.SCHEDULED_SCRIPT});
		scriptTask.scriptId = 'customscript_nbs272_dispatch_note_ss';
		scriptTask.deploymentId = 'customdeploy_nbs272_dispatch_note_ss';
		scriptTask.submit();
	}

	return {
		getInputData: getInputData,
		map: map,
		summarize: summarize
	};

});
