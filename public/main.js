'use strict'

let host = window.location.hostname
let username='demo',password='fe01ce2a7fbac8fafaed7c982a04e229'

$.ajax({
    url: `http://${host}:3002/auth/login`,
    type: 'POST',
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    timeout: 5000,
    data: JSON.stringify({
        "username":username,
        "password":password
    })
}).done(function (auth_res) {
    $.ajax({
        url: `/api/sysmaps?token=${auth_res.data.token}`,
        type: 'GET',
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        timeout: 5000,
    }).done(function (maps) {
        _.each(maps.data, function(map) {
            $('#map_select')
                .append($("<option></option>")
                    .attr("value",map.sysmapid)
                    .text(map.name));
        });
        $('#map_select').change(function() {
            var opt_sel = $(this).find('option:selected');
            var map_sel = _.find(maps.data,function(map){return map.sysmapid==opt_sel.val()});
            $('#cy').width(map_sel.width).height(map_sel.height);
            $.ajax({
                method: "POST",
                url: `/api/sysmaps?sysmapid=${map_sel.sysmapid}&token=${auth_res.data.token}`,
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: function(result){
                    var cy = cytoscape({
                        container: $('#cy'),
                        style: [
                            {
                                selector: 'node',
                                style: {
                                    label: 'data(label)',
                                    'text-wrap': 'wrap',
                                    'text-max-width': '100px',
                                    'font-size': '10',
                                    width: 60,
                                    height: 60
                                }
                            },
                            {
                                selector: 'edge[value=1]',
                                style: {
                                    'line-color': 'red'
                                }
                            }],
                    });
                    let elements = result.data.elements
                    _.each(elements,(element)=>{
                        var node = cy.add({
                                data: { id: element.selementid.toString(),label:element.label },
                                position:{x:element.x,y:element.y}
                            }
                        );
                        node.css("background-image", `url(${element.iconid_off})`)
                    })
                    let links = result.data.links
                    let triggers = result.data.triggers
                    var mergeLinkWithTrigger = (link)=>{
                        let link_trigger = _.find(triggers,(trigger)=>{
                            return trigger.linkid == link.linkid
                        })
                        if(link_trigger){
                            link.triggerid = link_trigger.triggerid
                            link.value = link_trigger.value
                        }
                        return link
                    }
                    const LINK_ID_OFFSET=10000
                    _.each(links,(link)=>{
                        link = mergeLinkWithTrigger(link)
                        link.linkid += LINK_ID_OFFSET
                        cy.add({
                            data:{id:(link.linkid).toString(),source:link.selementid1.toString(),target:link.selementid2.toString(),value:link.value}
                        })
                    })
                    var layout = cy.layout({
                        name: 'preset',
                    });
                    layout.run();
                }
            })
        });
    })
}).fail(function(err) {
    console.log(err);
})



