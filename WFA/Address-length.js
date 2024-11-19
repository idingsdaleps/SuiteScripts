/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
define(['N/record','N/runtime','N/task','./moment.js', 'N/https'], function(record, runtime,task, moment, https) {
function onAction(scriptContext){


//Set variables based on script parameters

var myScript = runtime.getCurrentScript();
const ORDER_ID = myScript.getParameter('custscript_addr_orderid'); 
var ADDR1 = myScript.getParameter('custscript_addr_addr1'); 
var ADDR2 = myScript.getParameter('custscript_addr_addr2'); 
var ADDR3 = myScript.getParameter('custscript_addr_addr3'); 
const ADDR_TYPE = myScript.getParameter('custscript_addr_type');



    const orderRecord = scriptContext.newRecord;
    var current_order = record.load({
        type: record.Type.SALES_ORDER,
        id : orderRecord.id,
        isDynamic: false
    });


log.audit("Order ID " + orderRecord.id , "Line 1 length " + ADDR1.length + " is " + ADDR1);
log.audit("Order ID " + orderRecord.id , "Line 2 length " + ADDR2.length + " is " + ADDR2);
log.audit("Order ID " + orderRecord.id , "Line 3 length " + ADDR3.length + " is " + ADDR3);


function street_abbreviate(addr_line){
var abbreviations = {
  'ROAD': 'Rd',
  'STREET': 'St',
  'PLACE': 'Pl',
  'DRIVE': 'Dr',
  'GARDENS' : 'Gdns',
  'AVENUE' : 'Av',
  'COURT' : 'Ct'
};
for (var key in abbreviations) {
  var re = new RegExp(key, 'gi');
  addr_line = addr_line.replace(re, abbreviations[key]);
}
log.audit("Order ID " + orderRecord.id, "Abbreviated line " + addr_line)
return addr_line;


}

try {

var lastcomma = ADDR1.substr(0,32).lastIndexOf(",");
if((ADDR1.length>32) && (!ADDR2 || !ADDR3) && (lastcomma>0)){
    log.audit("Order ID " + orderRecord.id , "Address 1 is splittable based on COMMAS")
    if(ADDR2 && !ADDR3){
        log.audit("Order ID " + orderRecord.id , "Line 2 populated, line 3 empty - moving line2 to line3")
        ADDR3 = ADDR2;
        ADDR2 = ""
    }

ADDR2 = ADDR1.substr(lastcomma + 1, ADDR1.length);
ADDR1 = ADDR1.substr(0,lastcomma);
}


var lastspace = ADDR1.substr(0,32).lastIndexOf(" ");
if((ADDR1.length>32) && (!ADDR2 || !ADDR3) && (lastspace>0)){
    log.audit("Order ID " + orderRecord.id , "Address 1 is splittable based on SPACES")
    if(ADDR2 && !ADDR3){
        log.audit("Order ID " + orderRecord.id , "Line 2 populated, line 3 empty - moving line2 to line3")
        ADDR3 = ADDR2;
        ADDR2 = ""
    }

ADDR2 = ADDR1.substr(lastspace + 1, ADDR1.length);
ADDR1 = ADDR1.substr(0,lastspace);
}


var lastcomma2 = ADDR2.substr(0,32).lastIndexOf(",");
if((ADDR2.length>32) && (!ADDR3) && (lastcomma2>0)){
    log.audit("Order ID " + orderRecord.id , "Address 2 is splittable based on COMMAS")
    ADDR3 = ADDR2.substr(lastcomma2 + 1, ADDR2.length);
    ADDR2 = ADDR2.substr(0,lastcomma2);
}

var lastspace2 = ADDR2.substr(0,32).lastIndexOf(" ");
if((ADDR2.length>32) && (!ADDR3) && (lastspace2>0)){
    log.audit("Order ID " + orderRecord.id , "Address 2 is splittable based on SPACES")
    ADDR3 = ADDR2.substr(lastspace2 + 1, ADDR2.length);
    ADDR2 = ADDR2.substr(0,lastspace2);
}





if((ADDR1.length)>32){
    ADDR1 = street_abbreviate(ADDR1);
    log.audit("Order ID " + orderRecord.id , "Line 1 abbreviated " + ADDR1)
}

if((ADDR2.length)>32){
    ADDR2 = street_abbreviate(ADDR2);
    log.audit("Order ID " + orderRecord.id , "Line 2 abbreviated " + ADDR2)
}

if((ADDR3.length)>32){
    ADDR3 = street_abbreviate(ADDR3);
    log.audit("Order ID " + orderRecord.id , "Line 3 abbreviated " + ADDR3)
}


log.audit("Order ID " + orderRecord.id , "Line 1 length " + ADDR1.length + " is now " + ADDR1);
log.audit("Order ID " + orderRecord.id , "Line 2 length " + ADDR2.length + " is now " + ADDR2);
log.audit("Order ID " + orderRecord.id , "Line 3 length " + ADDR3.length + " is now " + ADDR3);

var proposed_address = ADDR1 + "(" + ADDR1.length + ")" + "<br>" + ADDR2 + "(" + ADDR2.length + ")" + "<br>" + ADDR3 + "(" + ADDR3.length + ")"

if(ADDR_TYPE=='SHIPPING'){

var shipAddress = current_order.getSubrecord({
    fieldId: 'shippingaddress'
});
shipAddress.setValue({
    fieldId: 'addr1',
    value: ADDR1
});
shipAddress.setValue({
    fieldId: 'addr2',
    value: ADDR2
});
shipAddress.setValue({
    fieldId: 'addr3',
    value: ADDR3
});

}

if(ADDR_TYPE=='BILLING'){

var shipAddress = current_order.getSubrecord({
    fieldId: 'billaddress'
});
shipAddress.setValue({
    fieldId: 'addr1',
    value: ADDR1
});
shipAddress.setValue({
    fieldId: 'addr2',
    value: ADDR2
});
shipAddress.setValue({
    fieldId: 'addr3',
    value: ADDR3
});

}

if((ADDR1.length>32)||(ADDR2.length>32)||(ADDR3.length>32)){

current_order.setValue({
    fieldId: 'custbody_nbs_onhold',
    value: true
});

current_order.setValue({
    fieldId: 'custbody_nbs_onholdreason',
    value: 34
});


}

try {
            var recId = current_order.save();
            log.debug({
                title: 'Address successfully saved',
                details: 'Id: ' + recId
            });
        } catch (e) {
            log.error({
                title: e.name,
                details: e.message      
            });
    }






             
 }
     
        catch (e) {
            log.audit("Order ID " + orderRecord.id , "ERROR : " + e.name, e.message);
        }
    }


    return {
        onAction: onAction
    }
}); 

