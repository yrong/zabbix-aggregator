'use strict'

let host = window.location.hostname
let username='demo',password='fe01ce2a7fbac8fafaed7c982a04e229'
let map_selected,map_result,display_params={},cy;

const addMaps = (maps)=>{
    _.each(maps, function(map) {
        $('#map_select')
            .append($("<option></option>")
                .attr("value",map.sysmapid)
                .text(map.name));
    });
}

const mergeLinkWithTrigger = (triggers,link)=>{
    let link_trigger = _.find(triggers,(trigger)=>{
        return trigger.linkid == link.linkid
    })
    if(link_trigger){
        link.triggerid = link_trigger.triggerid
        link.value = link_trigger.value
    }
    return link
}

const replaceLinkLabelWithUnknown = (link)=>{
    let curly_bracket_re = /(\{.+?\})/g
    if(link.label)
        link.label = link.label.replace(curly_bracket_re,`*UNKNOWN*`)
    return link
}

const renderMap = ()=>{
    let font_size = display_params.font_size||'14%',label_padding=10
    if(map_result){
        cy = cytoscape({
            container: $('#cy'),
            style:
                [
                    {
                        selector: 'node,edge',
                        style: {
                            label: 'data(label)',
                            'text-wrap': 'wrap',
                            'font-size': font_size,
                            'text-background-padding':label_padding
                        }
                    },
                    {
                        selector: 'node',
                        style: {
                            'color': 'black',
                            "background-fit":"contain"
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'z-index': 5
                        }
                    },
                    {
                        selector: 'edge[value=1]',
                        style: {
                            'line-color': 'red'
                        }
                    },
                ],
        });
        let elements = map_result.data.elements
        _.each(elements,(element)=>{
            var node = cy.add({
                    data: { id: element.selementid.toString(),label:element.label },
                    position:{x:element.x,y:element.y}
                }
            );
            node.css("background-image", `url(${element.iconid_off})`)
        })
        let links = map_result.data.links
        let triggers = map_result.data.triggers
        const LINK_ID_OFFSET=10000
        _.each(links,(link)=>{
            link = mergeLinkWithTrigger(triggers,link)
            link = replaceLinkLabelWithUnknown(link)
            link.linkid += LINK_ID_OFFSET
            cy.add({
                data:{id:(link.linkid).toString(),source:link.selementid1.toString(),target:link.selementid2.toString(),value:link.value,label:link.label}
            })
        })
        var layout = cy.layout({
            name: 'preset',
        });
        layout.run();
    }
}

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
        addMaps(maps.data)
        $('#map_select').change(function() {
            map_selected = _.find(maps.data,function(map){
                return map.sysmapid==$('#map_select').find('option:selected').val()
            });
            $('#cy').width(map_selected.width).height(map_selected.height);
            $.ajax({
                method: "POST",
                url: `/api/sysmaps?sysmapid=${map_selected.sysmapid}&token=${auth_res.data.token}`,
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: function(result){
                    map_result = result
                    renderMap()
                }
            })
        });
        $('#font_size_select').change(function() {
            display_params.font_size = $('#font_size_select').find('option:selected').val()
            renderMap()
        });
    })
}).fail(function(err) {
    console.log(err);
})



