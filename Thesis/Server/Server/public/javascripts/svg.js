var poly1 = new SVG('drawing').size('100%', '100%')
            .polygon().draw().stroke({ width: 1 });
            
        poly1.on('drawstart', function(e){
            console.log('draw start');
            document.addEventListener('keydown', function(e){
                if(e.keyCode == 13){
                    poly1.draw('done');
                    poly1.off('drawstart');
                }
            });
        });
        
        poly1.on('drawstop', function(){
            console.log('draw end');
        });