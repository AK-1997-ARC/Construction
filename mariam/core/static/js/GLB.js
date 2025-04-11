/*		v 0.3 - revised 27/9 2022 ILTP		*/
gsap.defaults({overwrite:"auto"});
var GLB = {};
GLB._mobileBreakpointW = 1000.5, GLB._isMobile = false;
GLB._vw = 0, GLB._vh = 0; //Current viewport size
GLB._reliableSh = 0, GLB._oldvwOuter = 0, GLB._vwOuter = 0; //Viewport including scrollbars (if any). Use this value for aligning with css media queries
var _vhDiv = document.getElementsByClassName("vh")[0]; //Vh unit on mobile
var _UA = window.navigator.userAgent;
//Detection
GLB._iOS = (/iPad|iPhone|iPod/.test(_UA)) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
GLB._androidVersion = 0, GLB._iOSVersion = 0;
function detectIE() {
	var msie = _UA.indexOf('MSIE ');
	if (msie > 0) {
		// IE 10 or older => return version number
		GLB._ieVersion = parseInt(_UA.substring(msie + 5, _UA.indexOf('.', msie)), 10);
		return true;
	}
	var trident = _UA.indexOf('Trident/');
	if (trident > 0) {
		// IE 11 => return version number
		var rv = _UA.indexOf('rv:');
		GLB._ieVersion = parseInt(_UA.substring(rv + 3, _UA.indexOf('.', rv)), 10);
		return true;
	}
	var edge = _UA.indexOf('Edge/');
	if (edge > 0) {
		// Edge (IE 12+) => return version number
		GLB._ieVersion = parseInt(_UA.substring(edge + 5, _UA.indexOf('.', edge)), 10);
		return true;
	}
	// other browser
	return false;
}
GLB._ieVersion = 11;
GLB._isIE = detectIE();
GLB._mac = _UA.indexOf('Macintosh') > -1;
GLB._safari = _UA.indexOf("Safari") > -1;
if(_UA.indexOf("Chrome") > -1 && GLB._safari) GLB._safari = false;
GLB._firefox = _UA.indexOf('Firefox') > -1;
GLB._hasTouch = "ontouchstart" in window; //Only use for additional functionality - there are too many devices with both mouse and touch now!
GLB._dpi = window.devicePixelRatio, GLB._windowScrollX = 0, GLB._windowScrollY = 0, GLB._windowTweenedScrollY = 0;
GLB._scrollAxis = 0;//0=normal/vertical, 1=horizontal
//Polyfill for .classList
"document"in self&&("classList"in document.createElement("_")&&(!document.createElementNS||"classList"in document.createElementNS("http://www.w3.org/2000/svg","g"))||function(t){"use strict";if("Element"in t){var e="classList",n="prototype",i=t.Element[n],s=Object,r=String[n].trim||function(){return this.replace(/^\s+|\s+$/g,"")},o=Array[n].indexOf||function(t){for(var e=0,n=this.length;e<n;e++)if(e in this&&this[e]===t)return e;return-1},c=function(t,e){this.name=t,this.code=DOMException[t],this.message=e},a=function(t,e){if(""===e)throw new c("SYNTAX_ERR","An invalid or illegal string was specified");if(/\s/.test(e))throw new c("INVALID_CHARACTER_ERR","String contains an invalid character");return o.call(t,e)},l=function(t){for(var e=r.call(t.getAttribute("class")||""),n=e?e.split(/\s+/):[],i=0,s=n.length;i<s;i++)this.push(n[i]);this._updateClassName=function(){t.setAttribute("class",this.toString())}},u=l[n]=[],f=function(){return new l(this)};if(c[n]=Error[n],u.item=function(t){return this[t]||null},u.contains=function(t){return-1!==a(this,t+="")},u.add=function(){for(var t,e=arguments,n=0,i=e.length,s=!1;t=e[n]+"",-1===a(this,t)&&(this.push(t),s=!0),++n<i;);s&&this._updateClassName()},u.remove=function(){var t,e,n=arguments,i=0,s=n.length,r=!1;do{for(t=n[i]+"",e=a(this,t);-1!==e;)this.splice(e,1),r=!0,e=a(this,t)}while(++i<s);r&&this._updateClassName()},u.toggle=function(t,e){t+="";var n=this.contains(t),i=n?!0!==e&&"remove":!1!==e&&"add";return i&&this[i](t),!0===e||!1===e?e:!n},u.toString=function(){return this.join(" ")},s.defineProperty){var h={get:f,enumerable:!0,configurable:!0};try{s.defineProperty(i,e,h)}catch(t){void 0!==t.number&&-2146823252!==t.number||(h.enumerable=!1,s.defineProperty(i,e,h))}}else s[n].__defineGetter__&&i.__defineGetter__(e,f)}}(self),function(){"use strict";var t=document.createElement("_");if(t.classList.add("c1","c2"),!t.classList.contains("c2")){var e=function(t){var i=DOMTokenList.prototype[t];DOMTokenList.prototype[t]=function(t){var e,n=arguments.length;for(e=0;e<n;e++)t=arguments[e],i.call(this,t)}};e("add"),e("remove")}if(t.classList.toggle("c3",!1),t.classList.contains("c3")){var n=DOMTokenList.prototype.toggle;DOMTokenList.prototype.toggle=function(t,e){return 1 in arguments&&!this.contains(t)==!e?e:n.call(this,t)}}t=null}());
//Intersection observer
GLB._hasIntersectionObs = false;
try{
	if("IntersectionObserver" in window && "IntersectionObserverEntry" in window && "intersectionRatio" in window.IntersectionObserverEntry.prototype) GLB._hasIntersectionObs = true;
}
catch(e){}
//Mobile version
if(GLB._hasTouch){
	if(GLB._iOS){
		//iOS version
		try{
			var _av = navigator.appVersion;
			var v = (_av).match(/OS (\d+)_(\d+)_?(\d+)?/);
			var ver = [parseInt(v[1], 10), parseInt(v[2], 10), parseInt(v[3] || 0, 10)];
			GLB._iOSVersion = ver[0];
		}
		catch(e){
			GLB._iOSVersion = 14;
		}
	}
	else{
		//Android version
		var ua = _UA.toLowerCase();
	    var match = ua.match(/android\s([0-9\.]*)/);
		if(match){
			var _androidVersion = match ? match[1] : false;
			GLB._androidVersion = parseFloat(_androidVersion); //Maybe we are on Windows (Surface etc.) so remember to check if (GLB._androidVersion > 0)
		}
	}
}
//Old IE
//GLB._isIE = true;
//GLB._ieVersion = 10;
if(GLB._isIE && GLB._ieVersion <= 11) document.body.classList.add("oldIe");
else if(GLB._isIE) document.body.classList.add("ie");

/*		"passive" event support		*/
GLB._supportsPassive = false;
try {
  var opts = Object.defineProperty({}, 'passive', {
    get: function() {
      GLB._supportsPassive = true;
    }
  });
  window.addEventListener("testPassive", null, opts);
  window.removeEventListener("testPassive", null, opts);
} catch (e) {}
//Crawlers are most often recognised with "bot"
GLB._isBot = (_UA.indexOf("bot") != -1);
//GLB._isBot = true;//debug;

if('scrollRestoration' in history) history.scrollRestoration = "manual";

/*		Handle viewport size		*/
GLB.screensize = function(){
	if(window.innerWidth) GLB._vw = window.innerWidth, GLB._vh = window.innerHeight;
	else GLB._vw = document.documentElement.offsetWidth, GLB._vh = document.documentElement.offsetHeight;
	GLB._vwOuter = GLB._vw;
}
GLB.resized = function(e, _skipLayout){
	GLB._oldvwOuter = GLB._vwOuter;
	GLB.screensize();
	if(GLB._oldvwOuter == 0) GLB._oldvwOuter = GLB._vwOuter;
	//Cancel for touchscreens with same width (user just scrolling and topbar hiding/showing).
	if(e && GLB._hasTouch && GLB._oldvwOuter === GLB._vwOuter){
		e.stopImmediatePropagation();
		return;
	}
	else if(!GLB._hasTouch){
		//Normal Mac/PC
		GLB._bodyRect = document.body.getBoundingClientRect(); //Used for getting actual width without scrollbars
		var _wDif = Math.abs(GLB._bodyRect.width - GLB._vwOuter);
		if(_wDif > 2 && _wDif < 100) GLB._vw = GLB._bodyRect.width; //Store width without scrollbars
		GLB._reliableSh = GLB._vh;
	}
	else{
		//Touch screens screen height is variable on some platforms, because the browser bar changes height
		GLB._reliableSh = _vhDiv.offsetHeight;
	}
	var _stateBefore = GLB._isMobile;
	GLB._isMobile = (GLB._vwOuter < GLB._mobileBreakpointW);

	//Horizontal scrolling without seeing rubberband (y scroll)
	if(GLB._iOS && GLB._hasTouch && GLB._vwOuter < 1181 && GLB._scrollAxis == 1 && !GLB._isMobile){
		document.documentElement.classList.add("ios");
		GLB._iosHoriScrolling = true;
		GLBEvents(document.body, "scroll", GLB.scrolled, true);
	}
	else if(GLB._iosHoriScrolling){
		document.documentElement.classList.remove("ios");
		GLB._iosHoriScrolling = false;
		GLBEvents(document.body, "scroll", GLB.scrolled, false);
	}
	
	if(_stateBefore != GLB._isMobile) window.dispatchEvent(GLBEvent("betweenBreakpoint", 0));
	if(_skipLayout) return; //First time we just need the values stored
	GLB.scrolled(null); //Update scroll value
	clearTimeout(GLB._layoutUpdateTimer);
	GLB._layoutUpdateTimer = setTimeout(GLB.dispatchUpdate, 30);
}
GLB.dispatchUpdate = function(){window.dispatchEvent(GLBEvent("LayoutUpdate", 0));}
GLB.scrolled = function(e){
	GLB._windowScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
	if(GLB._iosHoriScrolling) GLB._windowScrollX = document.body.scrollLeft;
	else GLB._windowScrollX = document.documentElement.scrollLeft;
}
GLB.offsetX = function(_el){
	var el = _el, offsetLeft = 0;
	do{
		offsetLeft += el.offsetLeft;
		el = el.offsetParent;
	}while(el);
	return offsetLeft;
	//return _el.getBoundingClientRect().top + GLB._windowScrollY;
}
GLB.offsetY = function(_el){
	var el = _el, offsetTop = 0;
	do{
		offsetTop += el.offsetTop;
		el = el.offsetParent;
	}while(el);
	return offsetTop;
	//return _el.getBoundingClientRect().top + GLB._windowScrollY;
}
/*		Event handling		*/
//Custom events with detail parameter >=IE9
function GLBEventsInit(){
	var _oldBrowser = window.XDomainRequest ? true : false;
	if(GLB._isIE && GLB._ieVersion >= 11) _oldBrowser = true;
	if(_oldBrowser){
		(function () {
			function CustomEvent ( event, params ) {
				params = params || { bubbles: false, cancelable: false, detail: undefined };
				var evt = document.createEvent( 'CustomEvent' );
				evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
				return evt;
			};
			CustomEvent.prototype = window.Event.prototype;
			window.CustomEvent = CustomEvent;
		})();
	}
}
function GLBEvent(_name, _id){
	var e;
	if(window.CustomEvent) e = new CustomEvent(_name, {bubbles:true,cancelable:true,detail:_id});
	else{
		e = document.createEvent('Event');
		e.initEvent(_name, true, true, {detail:_id});
		e.detail = _id;
	}
	return e;
}
function GLBEvents(el,type,h,add,useCapture){
	if(add){
		if(el.addEventListener){
			if(type == "scroll" /*|| type == "touchstart"*/) el.addEventListener(type,h, GLB._supportsPassive ? { passive: true } : false); //Scroll listeners on this site NEVER calls preventDefault
			else if(useCapture) el.addEventListener(type,h,true);
			else el.addEventListener(type,h,false);
		}
		 else if(el.attachEvent) el.attachEvent('on'+type,h);
	}
 	else{
		if(el.removeEventListener){
			if(type == "scroll" /*|| type == "touchstart"*/) el.removeEventListener(type,h, GLB._supportsPassive ? { passive: true } : false);
			else if(useCapture) el.removeEventListener(type,h,true);
			else el.removeEventListener(type,h,false);
		}
		 else if(el.detachEvent) el.detachEvent('on'+type,h);
	}
}
GLBEventsInit();
/*		Image object		*/
function GLBImage(_url, _holder, _w, _h, _className, onloadCallback, _insertBefore, _alt){
	var _this = this;
	var _alive = true, _removed = false;
	if(_w&&_h) _this.img = new Image(_w, _h);
	else _this.img = new Image();
	if(_alt || _alt == "") _this.img.alt = _alt;
	_this.img.className = _className;
	_this.width = 0, _this.height = 0; //Holds natural size unless scaleTo is used
	//Trick to make sure (Safari) renders the image in correct size before src has been set (because it's a horizontal layout) - seems needed when https for Chrome too!
	if(/*GLB._safari &&*/ !GLB._isMobile && _w&&_h) _this.img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 "+_w+" "+_h+"'%3E%3C/svg%3E";
	
	function add(){
		if(_holder){
			if(_insertBefore) _holder.insertBefore(_this.img, _holder.firstChild);
			else _holder.appendChild(_this.img);
		}
	}
	add();

	function loaded(e){
		if(!_alive) return;
		_this.width = _this.img.naturalWidth, _this.height = _this.img.naturalHeight;
		if(onloadCallback) onloadCallback.call(_this, e);
	}
	_this.load = function(){
		if(!_alive) return;
		if(_removed){
			add();
		}
		else{
			_this.img.onload = loaded;
			_this.img.src = _url;
			GLBEvents(_this.img, "mousedown", md, true);
			if(GLB._isMobile) GLBEvents(_this.img, "contextmenu", md, true);
		}
	}

	//Switching between responsive versions
	_this.remove = function(){
		if(_holder){
			if(_holder.contains(_this.img)) _holder.removeChild(_this.img);
		}
		_removed = true;
	}
	//Prevent dragging
	function md(e){
		if(e) e.preventDefault();
	}
	_this.destroy = function(){
		_alive = false;
		try{
			if(_holder) _holder.removeChild(_this.img);
		}
		catch(e){}
		onloadCallback = null;
		GLBEvents(_this.img, "mousedown", md, false);
		GLBEvents(_this.img, "contextmenu", md, false);
		_this.img.src = "";
		_this.img = null;
		_this = null;
	}
}
/*		Overwrite link behaviour (for SPA)		*/
function overWriteLink(_a){
	var _this = this;
	var _href = _a.getAttribute("href") || "";
	var _liveUpdateHref = false;
	if(_href.indexOf("?")) _liveUpdateHref = true;
	function clicked(e){
		if(e.metaKey || e.ctrlKey){
			return; //Open in new tab
		}
		try{e.preventDefault(), e.stopImmediatePropagation();}
		catch(e){}
		//console.log("Go to page:", _href);
		if(_liveUpdateHref) _href = _a.getAttribute("href") || "";
		_router.setUrl(_href);
	}
	function dragstart(e){e.preventDefault();}
	//Add listeners if not absolute path (email or tel)
	if(_href.indexOf("http") == -1 && _href.indexOf("mailto:") == -1 && _href.indexOf("tel:") == -1 && _href.indexOf("//") != 0){
		if(_router._useAPI){
			GLBEvents(_a, "click", clicked, true), GLBEvents(_a, "dragstart", dragstart, true);
		}
	}
	_this.destroy = function(){
		GLBEvents(_a, "click", clicked, false), GLBEvents(_a, "dragstart", dragstart, false);
	}
}
function forceResize(){
	GLB._vwOuter -= 1;
	if(GLB._isIE){
		var evt = document.createEvent("HTMLEvents");
	     evt.initEvent('resize', true, false);
	     window.dispatchEvent(evt);
	}
	else window.dispatchEvent(new Event("resize"));
}
//DOMParser patch
(function(DOMParser) {
    "use strict";
    var
      proto = DOMParser.prototype
    , nativeParse = proto.parseFromString
    ;
    // Firefox/Opera/IE throw errors on unsupported types
    try {
        // WebKit returns null on unsupported types
        if ((new DOMParser()).parseFromString("", "text/html")) {
            // text/html parsing is natively supported
            return;
        }
    } catch (ex) {}

    proto.parseFromString = function(markup, type) {
        if (/^\s*text\/html\s*(?:;|$)/i.test(type)) {
            var
              doc = document.implementation.createHTMLDocument("")
            ;
                if (markup.toLowerCase().indexOf('<!doctype') > -1) {
                    doc.documentElement.innerHTML = markup;
                }
                else {
                    doc.body.innerHTML = markup;
                }
            return doc;
        } else {
            return nativeParse.apply(this, arguments);
        }
    };
}(DOMParser));

//Object fit IE
/*! npm.im/object-fit-images 3.2.4 */
var objectFitImages=function(){"use strict";function t(t,e){return"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='"+t+"' height='"+e+"'%3E%3C/svg%3E"}function e(t){if(t.srcset&&!p&&window.picturefill){var e=window.picturefill._;t[e.ns]&&t[e.ns].evaled||e.fillImg(t,{reselect:!0}),t[e.ns].curSrc||(t[e.ns].supported=!1,e.fillImg(t,{reselect:!0})),t.currentSrc=t[e.ns].curSrc||t.src}}function i(t){for(var e,i=getComputedStyle(t).fontFamily,r={};null!==(e=u.exec(i));)r[e[1]]=e[2];return r}function r(e,i,r){var n=t(i||1,r||0);b.call(e,"src")!==n&&h.call(e,"src",n)}function n(t,e){t.naturalWidth?e(t):setTimeout(n,100,t,e)}function c(t){var c=i(t),o=t[l];if(c["object-fit"]=c["object-fit"]||"fill",!o.img){if("fill"===c["object-fit"])return;if(!o.skipTest&&f&&!c["object-position"])return}if(!o.img){o.img=new Image(t.width,t.height),o.img.srcset=b.call(t,"data-ofi-srcset")||t.srcset,o.img.src=b.call(t,"data-ofi-src")||t.src,h.call(t,"data-ofi-src",t.src),t.srcset&&h.call(t,"data-ofi-srcset",t.srcset),r(t,t.naturalWidth||t.width,t.naturalHeight||t.height),t.srcset&&(t.srcset="");try{s(t)}catch(t){window.console&&console.warn("https://bit.ly/ofi-old-browser")}}e(o.img),t.style.backgroundImage='url("'+(o.img.currentSrc||o.img.src).replace(/"/g,'\\"')+'")',t.style.backgroundPosition=c["object-position"]||"center",t.style.backgroundRepeat="no-repeat",t.style.backgroundOrigin="content-box",/scale-down/.test(c["object-fit"])?n(o.img,function(){o.img.naturalWidth>t.width||o.img.naturalHeight>t.height?t.style.backgroundSize="contain":t.style.backgroundSize="auto"}):t.style.backgroundSize=c["object-fit"].replace("none","auto").replace("fill","100% 100%"),n(o.img,function(e){r(t,e.naturalWidth,e.naturalHeight)})}function s(t){var e={get:function(e){return t[l].img[e?e:"src"]},set:function(e,i){return t[l].img[i?i:"src"]=e,h.call(t,"data-ofi-"+i,e),c(t),e}};Object.defineProperty(t,"src",e),Object.defineProperty(t,"currentSrc",{get:function(){return e.get("currentSrc")}}),Object.defineProperty(t,"srcset",{get:function(){return e.get("srcset")},set:function(t){return e.set(t,"srcset")}})}function o(){function t(t,e){return t[l]&&t[l].img&&("src"===e||"srcset"===e)?t[l].img:t}d||(HTMLImageElement.prototype.getAttribute=function(e){return b.call(t(this,e),e)},HTMLImageElement.prototype.setAttribute=function(e,i){return h.call(t(this,e),e,String(i))})}function a(t,e){var i=!y&&!t;if(e=e||{},t=t||"img",d&&!e.skipTest||!m)return!1;"img"===t?t=document.getElementsByTagName("img"):"string"==typeof t?t=document.querySelectorAll(t):"length"in t||(t=[t]);for(var r=0;r<t.length;r++)t[r][l]=t[r][l]||{skipTest:e.skipTest},c(t[r]);i&&(document.body.addEventListener("load",function(t){"IMG"===t.target.tagName&&a(t.target,{skipTest:e.skipTest})},!0),y=!0,t="img"),e.watchMQ&&window.addEventListener("resize",a.bind(null,t,{skipTest:e.skipTest}))}var l="fregante:object-fit-images",u=/(object-fit|object-position)\s*:\s*([-.\w\s%]+)/g,g="undefined"==typeof Image?{style:{"object-position":1}}:new Image,f="object-fit"in g.style,d="object-position"in g.style,m="background-size"in g.style,p="string"==typeof g.currentSrc,b=g.getAttribute,h=g.setAttribute,y=!1;return a.supportsObjectFit=f,a.supportsObjectPosition=d,o(),a}();

/*		Init		*/
//Fires when all scripts have loaded
GLBEvents(window, "resize", GLB.resized, true);
GLBEvents(window, "scroll", GLB.scrolled, true);
GLB.resized(null, true);
GLB.scrolled(null);
try{
	console.log("%cSite by The Beaux Arts Creative Agency, development by iliketoplay.dk", "background: #000000;color:#FFF;padding:4px 4px 2px 4px;");
	if(GLB._isBot){
		var _iltpA = document.createElement("a");
		_iltpA.className = "iltp";
		_iltpA.setAttribute("href", "https://iliketoplay.dk/"), _iltpA.setAttribute("target", "blank"), _iltpA.textContent = "Freelance creative frontend developer";
		document.getElementsByTagName("header")[0].getElementsByClassName("credits")[0].getElementsByTagName("p")[1].appendChild(_iltpA);
	}
}
catch(e){}