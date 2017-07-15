'use strict'

let auth_host='dev.scirichon.com',username='demo',password='fe01ce2a7fbac8fafaed7c982a04e229'

$.ajax({
    url: `http://${auth_host}:3002/auth/login`,
    type: 'POST',
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    timeout: 5000,
    data: JSON.stringify({
        "username":username,
        "password":password
    })
}).done(function (res) {
    $.ajax({
        method: "POST",
        url: `/api/sysmaps?sysmapid=2&token=${res.data.token}`,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(result){
            var cy = cytoscape({
                container: document.getElementById('cy'),
                style: [
                    {
                        selector: 'node',
                        style: {
                            shape: 'hexagon',
                            'background-color': 'red',
                            label: 'data(label)'
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            label: 'data(label)',
                            'font-size': '4px',
                            'font-weight': 'lighter',
                            'font-style': 'italic'
                        }
                    }],
            });
            let elements = result.data.elements
            _.each(elements,(element)=>{
                cy.add({
                        data: { id: element.selementid,label:element.host },
                        position:{x:element.x,y:element.y}
                    }
                );
            })
            let links = result.data.links
            _.each(links,(link)=>{
                cy.add({
                    data:{id:link.linkid,label:link.label,source:link.selementid1,target:link.selementid2}
                })
            })
            var layout = cy.layout({
                name: 'preset',
            });
            layout.run();
        },
        failure: function(err) {
            console.log(err);
        }
    })
}).fail(function(err) {
    console.log(err);
})



