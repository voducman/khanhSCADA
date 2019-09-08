/*!
 * @license
 * chartjs-plugin-zoom
 * http://chartjs.org/
 * Version: 0.7.0
 *
 * Copyright 2019 Chart.js Contributors
 * Released under the MIT license
 * https://github.com/chartjs/chartjs-plugin-zoom/blob/master/LICENSE.md
 */
!function(o,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e(require("chart.js"),require("hammerjs")):"function"==typeof define&&define.amd?define(["chart.js","hammerjs"],e):(o=o||self).ChartZoom=e(o.Chart,o.Hammer)}(this,function(o,e){"use strict";o=o&&o.hasOwnProperty("default")?o.default:o,e=e&&e.hasOwnProperty("default")?e.default:e;var t=o.helpers,n=o.Zoom=o.Zoom||{},a=n.zoomFunctions=n.zoomFunctions||{},i=n.panFunctions=n.panFunctions||{};function m(o,e){var n={};void 0!==o.options.pan&&(n.pan=o.options.pan),void 0!==o.options.pan&&(n.zoom=o.options.zoom),o.$zoom._options=t.merge({},[e,n])}function r(o){var e=o.$zoom._originalOptions;t.each(o.scales,function(o){e[o.id]||(e[o.id]=t.clone(o.options))}),t.each(e,function(t,n){o.scales[n]||delete e[n]})}function l(o,e){return void 0===o||"string"==typeof o&&-1!==o.indexOf(e)}function s(o,e){if(o.scaleAxes&&o.rangeMax&&!t.isNullOrUndef(o.rangeMax[o.scaleAxes])){var n=o.rangeMax[o.scaleAxes];e>n&&(e=n)}return e}function c(o,e){if(o.scaleAxes&&o.rangeMin&&!t.isNullOrUndef(o.rangeMin[o.scaleAxes])){var n=o.rangeMin[o.scaleAxes];e<n&&(e=n)}return e}function u(o,e,t,n){var a=o.max-o.min,i=a*(e-1),m=o.isHorizontal()?t.x:t.y,r=(o.getValueForPixel(m)-o.min)/a,l=i*r,u=i*(1-r);o.options.ticks.min=c(n,o.min+l),o.options.ticks.max=s(n,o.max-u)}function d(o,e,t,n){var i=a[o.type];i&&i(o,e,t,n)}function p(o,e,n,a,i){var m=o.chartArea;a||(a={x:(m.left+m.right)/2,y:(m.top+m.bottom)/2});var s=o.$zoom._options.zoom;if(s.enabled){r(o);var c,u=s.mode;c="xy"===u&&void 0!==i?i:"xy",t.each(o.scales,function(o){o.isHorizontal()&&l(u,"x")&&l(c,"x")?(s.scaleAxes="x",d(o,e,a,s)):!o.isHorizontal()&&l(u,"y")&&l(c,"y")&&(s.scaleAxes="y",d(o,n,a,s))}),o.update(0),"function"==typeof s.onZoom&&s.onZoom({chart:o})}}function f(o,e,n){var a,i=o.options.ticks,m=o.min,r=o.max,l=o.getValueForPixel(o.getPixelForValue(m)-e),s=o.getValueForPixel(o.getPixelForValue(r)-e),c=l,u=s;n.scaleAxes&&n.rangeMin&&!t.isNullOrUndef(n.rangeMin[n.scaleAxes])&&(c=n.rangeMin[n.scaleAxes]),n.scaleAxes&&n.rangeMax&&!t.isNullOrUndef(n.rangeMax[n.scaleAxes])&&(u=n.rangeMax[n.scaleAxes]),l>=c&&s<=u?(i.min=l,i.max=s):l<c?(a=m-c,i.min=c,i.max=r-a):s>u&&(a=u-r,i.max=u,i.min=m+a)}function v(o,e,t){var n=i[o.type];n&&n(o,e,t)}function z(o){for(var e=o.scales,t=Object.keys(e),n=0;n<t.length;n++){var a=e[t[n]];if(a.isHorizontal())return a}}function h(o){for(var e=o.scales,t=Object.keys(e),n=0;n<t.length;n++){var a=e[t[n]];if(!a.isHorizontal())return a}}o.Zoom.defaults=o.defaults.global.plugins.zoom={pan:{enabled:!1,mode:"xy",speed:20,threshold:10},zoom:{enabled:!1,mode:"xy",sensitivity:3,speed:.1}},n.zoomFunctions.category=function(o,e,t,a){var i=o.chart.data.labels,m=o.minIndex,r=i.length-1,l=o.maxIndex,u=a.sensitivity,d=o.isHorizontal()?o.left+o.width/2:o.top+o.height/2,p=o.isHorizontal()?t.x:t.y;n.zoomCumulativeDelta=e>1?n.zoomCumulativeDelta+1:n.zoomCumulativeDelta-1,Math.abs(n.zoomCumulativeDelta)>u&&(n.zoomCumulativeDelta<0?(p>=d?m<=0?l=Math.min(r,l+1):m=Math.max(0,m-1):p<d&&(l>=r?m=Math.max(0,m-1):l=Math.min(r,l+1)),n.zoomCumulativeDelta=0):n.zoomCumulativeDelta>0&&(p>=d?m=m<l?m=Math.min(l,m+1):m:p<d&&(l=l>m?l=Math.max(m,l-1):l),n.zoomCumulativeDelta=0),o.options.ticks.min=c(a,i[m]),o.options.ticks.max=s(a,i[l]))},n.zoomFunctions.time=function(o,e,t,n){u(o,e,t,n),o.options.time.min=o.options.ticks.min,o.options.time.max=o.options.ticks.max},n.zoomFunctions.linear=u,n.zoomFunctions.logarithmic=u,n.panFunctions.category=function(o,e,t){var a,i=o.chart.data.labels,m=i.length-1,r=Math.max(o.ticks.length,1),l=t.speed,u=o.minIndex,d=Math.round(o.width/(r*l));n.panCumulativeDelta+=e,u=n.panCumulativeDelta>d?Math.max(0,u-1):n.panCumulativeDelta<-d?Math.min(m-r+1,u+1):u,n.panCumulativeDelta=u!==o.minIndex?0:n.panCumulativeDelta,a=Math.min(m,u+r-1),o.options.ticks.min=c(t,i[u]),o.options.ticks.max=s(t,i[a])},n.panFunctions.time=function(o,e,t){f(o,e,t);var n=o.options;n.time.min=n.ticks.min,n.time.max=n.ticks.max},n.panFunctions.linear=f,n.panFunctions.logarithmic=f,n.panCumulativeDelta=0,n.zoomCumulativeDelta=0;var x={id:"zoom",afterInit:function(o){o.resetZoom=function(){r(o);var e=o.$zoom._originalOptions;t.each(o.scales,function(o){var t=o.options.time,n=o.options.ticks;e[o.id]?(t&&(t.min=e[o.id].time.min,t.max=e[o.id].time.max),n&&(n.min=e[o.id].ticks.min,n.max=e[o.id].ticks.max)):(t&&(delete t.min,delete t.max),n&&(delete n.min,delete n.max))}),o.update()}},beforeUpdate:function(o,e){m(o,e)},beforeInit:function(o,a){o.$zoom={_originalOptions:{}},m(o,a);var i=o.$zoom._node=o.chart.ctx.canvas,s=o.$zoom._options,c=s.pan&&s.pan.threshold;if(o.$zoom._mouseDownHandler=function(e){o.$zoom._options.zoom&&o.$zoom._options.zoom.drag&&(i.addEventListener("mousemove",o.$zoom._mouseMoveHandler),o.$zoom._dragZoomStart=e)},i.addEventListener("mousedown",o.$zoom._mouseDownHandler),o.$zoom._mouseMoveHandler=function(e){o.$zoom._options.zoom&&o.$zoom._options.zoom.drag&&o.$zoom._dragZoomStart&&(o.$zoom._dragZoomEnd=e,o.update(0))},o.$zoom._mouseUpHandler=function(e){if(o.$zoom._options.zoom&&o.$zoom._options.zoom.drag&&o.$zoom._dragZoomStart){i.removeEventListener("mousemove",o.$zoom._mouseMoveHandler);var t=o.chartArea,n=z(o),a=h(o),m=o.$zoom._dragZoomStart,r=n.left,s=n.right,c=a.top,u=a.bottom;if(l(o.$zoom._options.zoom.mode,"x")){var d=m.target.getBoundingClientRect().left;r=Math.min(m.clientX,e.clientX)-d,s=Math.max(m.clientX,e.clientX)-d}if(l(o.$zoom._options.zoom.mode,"y")){var f=m.target.getBoundingClientRect().top;c=Math.min(m.clientY,e.clientY)-f,u=Math.max(m.clientY,e.clientY)-f}var v=s-r,x=t.right-t.left,g=1+(x-v)/x,$=u-c,_=t.bottom-t.top,y=1+(_-$)/_;o.$zoom._dragZoomStart=null,o.$zoom._dragZoomEnd=null,(v>0||$>0)&&p(o,g,y,{x:(r-t.left)/(1-v/x)+t.left,y:(c-t.top)/(1-$/_)+t.top})}},i.ownerDocument.addEventListener("mouseup",o.$zoom._mouseUpHandler),o.$zoom._wheelHandler=function(e){if(!o.$zoom._options.zoom||!o.$zoom._options.zoom.drag){var t=e.target.getBoundingClientRect(),n={x:e.clientX-t.left,y:e.clientY-t.top},a=o.$zoom._options.zoom.speed;e.deltaY>=0&&(a=-a),p(o,1+a,1+a,n),e.preventDefault()}},i.addEventListener("wheel",o.$zoom._wheelHandler),e){var u,d=new e.Manager(i);d.add(new e.Pinch),d.add(new e.Pan({threshold:c}));var f=function(e){var t=1/u*e.scale,n=e.target.getBoundingClientRect(),a={x:e.center.x-n.left,y:e.center.y-n.top},i=Math.abs(e.pointers[0].clientX-e.pointers[1].clientX),m=Math.abs(e.pointers[0].clientY-e.pointers[1].clientY),r=i/m;p(o,t,t,a,r>.3&&r<1.7?"xy":i>m?"x":"y"),u=e.scale};d.on("pinchstart",function(){u=1}),d.on("pinch",f),d.on("pinchend",function(o){f(o),u=null,n.zoomCumulativeDelta=0});var x=null,g=null,$=!1,_=function(e){if(null!==x&&null!==g){$=!0;var n=e.deltaX-x,a=e.deltaY-g;x=e.deltaX,g=e.deltaY,function(o,e,n){r(o);var a=o.$zoom._options.pan;if(a.enabled){var i=a.mode;t.each(o.scales,function(o){o.isHorizontal()&&l(i,"x")&&0!==e?(a.scaleAxes="x",v(o,e,a)):!o.isHorizontal()&&l(i,"y")&&0!==n&&(a.scaleAxes="y",v(o,n,a))}),o.update(0),"function"==typeof a.onPan&&a.onPan({chart:o})}}(o,n,a)}};d.on("panstart",function(o){x=0,g=0,_(o)}),d.on("panmove",_),d.on("panend",function(){x=null,g=null,n.panCumulativeDelta=0,setTimeout(function(){$=!1},500)}),o.$zoom._ghostClickHandler=function(o){$&&(o.stopImmediatePropagation(),o.preventDefault())},i.addEventListener("click",o.$zoom._ghostClickHandler),o._mc=d}},beforeDatasetsDraw:function(o){var e=o.chart.ctx,t=o.chartArea;if(e.save(),e.beginPath(),o.$zoom._dragZoomEnd){var n=z(o),a=h(o),i=o.$zoom._dragZoomStart,m=o.$zoom._dragZoomEnd,r=n.left,s=n.right,c=a.top,u=a.bottom;if(l(o.$zoom._options.zoom.mode,"x")){var d=i.target.getBoundingClientRect().left;r=Math.min(i.clientX,m.clientX)-d,s=Math.max(i.clientX,m.clientX)-d}if(l(o.$zoom._options.zoom.mode,"y")){var p=i.target.getBoundingClientRect().top;c=Math.min(i.clientY,m.clientY)-p,u=Math.max(i.clientY,m.clientY)-p}var f=s-r,v=u-c,x=o.$zoom._options.zoom.drag;e.fillStyle=x.backgroundColor||"rgba(225,225,225,0.3)",e.fillRect(r,c,f,v),x.borderWidth>0&&(e.lineWidth=x.borderWidth,e.strokeStyle=x.borderColor||"rgba(225,225,225)",e.strokeRect(r,c,f,v))}e.rect(t.left,t.top,t.right-t.left,t.bottom-t.top),e.clip()},afterDatasetsDraw:function(o){o.chart.ctx.restore()},destroy:function(o){if(o.$zoom){var t=o.$zoom._node;o.$zoom._options.zoom&&(t.removeEventListener("mousedown",o.$zoom._mouseDownHandler),t.removeEventListener("mousemove",o.$zoom._mouseMoveHandler),t.ownerDocument.removeEventListener("mouseup",o.$zoom._mouseUpHandler),t.removeEventListener("wheel",o.$zoom._wheelHandler)),e&&t.removeEventListener("click",o.$zoom._ghostClickHandler),delete o.$zoom;var n=o._mc;n&&(n.remove("pinchstart"),n.remove("pinch"),n.remove("pinchend"),n.remove("panstart"),n.remove("pan"),n.remove("panend"))}}};return o.plugins.register(x),x});
