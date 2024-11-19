let record = require(['N/record'], execute);
function execute(record){
    var customer = record.load({type: 'customer', id: 4726790});
      try {
                var recId = customer.save();
            customer.setValue({
            fieldId: 'leadsource',
            value: 3760407
            });

            } catch (e) {
                console.log(e);
             }
    }    