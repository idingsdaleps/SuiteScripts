
continuous


const _printAddressLabel = (addressDetails) => {
            let xml = '<?xml version="1.0"?>\n<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">\n';
            xml += '<pdf><body width="150mm" height="38mm" style="padding: 8; font-size:9pt"><table cellpadding="1" cellspacing="1" style="width: 140mm;"><tr><td>';
            xml += addressDetails.addressee + '<br/>';
            xml += addressDetails.address1 + '<br/>';
            if(addressDetails.address2){
                xml += addressDetails.address2 + '<br/>'
            }
            if(addressDetails.address3){
                xml += addressDetails.address3 + '<br/>'
            }
            xml += addressDetails.city + '<br/>'
            xml += addressDetails.zip + '<br/>'
            if(addressDetails.state){
                xml += addressDetails.state + '<br/>';
            }
            
            xml += addressDetails.country + '<br/></td>';

            xml += '<td><img src="https://images.psbooks.co.uk/images/rm-indicia.png" width="40%" height="40%" align="right"/></td></tr></table>';
            
            xml += "</body></pdf>";
            return render.xmlToPdf({xmlString: xml});
        }


large
        

        const _printAddressLabel = (addressDetails) => {
            let xml = '<?xml version="1.0"?>\n<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">\n';
            xml += '<pdf><body width="100mm" height="62mm" style="padding: 8; font-size:10pt"><table cellpadding="1" cellspacing="1" align="center" style="width: 60mm;"><tr><td><img src="https://images.psbooks.co.uk/images/rm-indicia.png" width="45%" height="45%" align="left"/></td></tr><tr><td>';
            xml += addressDetails.addressee + '<br/>';
            xml += addressDetails.address1 + '<br/>';
            if(addressDetails.address2){
                xml += addressDetails.address2 + '<br/>'
            }
            if(addressDetails.address3){
                xml += addressDetails.address3 + '<br/>'
            }
            xml += addressDetails.city + '<br/>'
            xml += addressDetails.zip + '<br/>'
            if(addressDetails.state){
                xml += addressDetails.state + '<br/>';
            }
            
            xml += addressDetails.country + '<br/></td></tr></table>';

           
            xml += "</body></pdf>";
            return render.xmlToPdf({xmlString: xml});
        }