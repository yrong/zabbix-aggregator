'use strict'

let host = window.location.hostname
let username='demo',password='fe01ce2a7fbac8fafaed7c982a04e229'
let auth_token,map_result,display_params={},cy;
let opscontrollerSocket = io( `http://${host}:3001/opscontroller` )
let recv_events = [],last_event_ts

const apiInvoke = (url, method, data, cb) => {
    let options = {
        url: url,
        type: method,
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
    }
    if (data)
        options.data = data
    $.ajax(options).done(cb)
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

const addNodes = ()=>{
    let elements = map_result.data.elements
    _.each(elements,(element)=>{
        var node = cy.add({
                data: { id: element.selementid.toString(),label:element.label,elementtype:element.elementtype },
                position:{x:element.x,y:element.y}
            }
        );
        node.css("background-image", `url(${element.iconid_off})`)
    })
}

const addLinks = ()=>{
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
}

const initCytoscape = ()=>{
    let font_size = display_params.font_size||'14%',label_padding=10
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
                    selector: 'edge[value=1]',
                    style: {
                        'line-color': 'red'
                    }
                },
            ],
    });
}

const addContextMenu = ()=>{
    cy.contextMenus({
        menuItems: [
            {
                id: 'ping',
                content: 'ping',
                selector: 'node[elementtype=0]',
                onClickFunction: function (event) {
                    var target = event.target || event.cyTarget;
                    var data = target._private.data
                    recv_events = [],last_event_ts = new Date()
                    $.notifyDefaults({
                        delay: 3000,
                        placement: {
                            from: "top",
                            align: "right"
                        },
                        allow_dismiss: false
                    });
                    $.notify(`start ping ${data.label},waiting...`)
                    data = {hosts:[data.label],script_type:'shell',cutomized_cmd:'local-ping'}
                    opscontrollerSocket.emit( 'executeScript', data)
                    showEvents()
                },
                hasTrailingDivider: true
            }
        ]
    });
}

const renderMapLayout = ()=>{
    cy.layout({name: 'preset'}).run()
}

const renderMap = ()=>{
    initCytoscape()
    addNodes()
    addLinks()
    addContextMenu()
    renderMapLayout()
}

const initMapSelect = (maps)=>{
    _.each(maps, function(map) {
        $('#map_select')
            .append($("<option></option>")
                .attr("value",map.sysmapid)
                .text(map.name));
    });
    $('#map_select').change(function() {
        let map_selected = _.find(maps,function(map){
            return map.sysmapid==$('#map_select').find('option:selected').val()
        });
        // $('#cy').width(map_selected.width).height(map_selected.height);
        apiInvoke(`/api/sysmaps?sysmapid=${map_selected.sysmapid}&token=${auth_token}`,'POST',null,(map_res)=>{
            map_result = map_res
            renderMap()
        })
    });
    $('#font_size_select').change(function() {
        display_params.font_size = $('#font_size_select').find('option:selected').val()
        if(map_result)
            renderMap()
    });
}

const isFinish = ()=>{
    return (new Date().getTime() - last_event_ts) > 1000 || recv_events.length > 10
}

const showEvents = ()=>{

    let finish = isFinish()

    if(!finish)
    {
        setTimeout(function () {
            showEvents();
        }, 100);
    }else{
        if(recv_events.length){
            let settings = {
                icon: 'fa fa-paw',
                type: 'success',
                allow_dismiss: true,
                delay:0
            }
            let events = []
            _.each(recv_events,(event)=>{
                events.push(event.response)
                if(event.dir === 2)
                    settings.type = 'danger'
            })
            $.notify({message:events.join('<br>')},settings);
        }
    }
}

const addOpsListener = ()=>{
    opscontrollerSocket.on( 'executeScriptResponse', function( event ) {
        last_event_ts = new Date()
        recv_events.push(event)
    })
    opscontrollerSocket.on( 'executeScriptError', function( error ) {
        var settings = {
            icon: 'fa fa-paw',
            type: 'danger',
            allow_dismiss: true,
            delay:0
        }
        $.notify({message:error},settings);
    })
}

apiInvoke(`http://${host}:3002/auth/login`, 'POST', JSON.stringify({
    "username": username,
    "password": password
}), (auth_res) => {
    auth_token = auth_res.data.token
    apiInvoke(`/api/sysmaps?token=${auth_token}`,'GET',null,(maps_res)=>{initMapSelect(maps_res.data)})
    addOpsListener()
})




