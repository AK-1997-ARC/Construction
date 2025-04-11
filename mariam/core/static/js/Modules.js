/*		v 2.1 - revised 24/10 2024 ILTP		*/
//Observer util (detects in-viewport and fires load callback)
function Observer(_target, _margin, _threshold, _inCB, _outCB){
	var _this = this;
	var _observer;
	var _destroyOnIntersect = true;
	if(_outCB) _destroyOnIntersect = false;

	function intersected(entries){
		if(entries[0].isIntersecting || (entries.length > 1 && entries[1].isIntersecting)){
			if(_destroyOnIntersect){
				_observer.unobserve(_target);
				_observer = null;
			}
			_inCB.call();
		}
		else if(!_destroyOnIntersect){
			if(_outCB) _outCB.call();
		}
	}

	if(GLB._hasIntersectionObs){
		var _m = _margin * GLB._reliableSh + "px";
		_observer = new IntersectionObserver(intersected, {root:null,rootMargin:_m,threshold:_threshold});
		_observer.observe(_target);
	}
	else _inCB.call();

	_this.destroy = function(){
		if(_observer){
			_observer.unobserve(_target);
			_observer = null;
		}
	}
}
//Lazy loading image/video
function LazyMedia(_me){
	var _this = this;
	//Relation
	var _sizes = (_me.getAttribute("data-rel") || "").split(",");
	var _rel = document.createElement("div");
	_rel.className = "rel";
	var _horizontal = false, _delayed = false;
	if(_me.className.indexOf("hori") != -1) _horizontal = true;
	if(_me.className.indexOf("delayed") != -1) _delayed = true;
	
	function setRel(){
		if(GLB._isMobile) _rel.style.paddingTop = ((_sizes[3] / _sizes[2]) * 100) + "%";
		else{
			if(_horizontal) _rel.style.paddingTop = "0%";
			else _rel.style.paddingTop = ((_sizes[1] / _sizes[0]) * 100) + "%";
		}
	}
	if(_sizes.length > 2) GLBEvents(window, "betweenBreakpoint", setRel, true), setRel();
	else if(_sizes.length > 1){
		if(_horizontal) _rel.style.paddingTop = "0%";
		else _rel.style.paddingTop = ((_sizes[1] / _sizes[0]) * 100) + "%";
	}
	_me.appendChild(_rel);

	//This can be either image or video
	var _urls = _me.getAttribute("data-src") || "";
	var _isVideo = (_urls.indexOf("mp4") != -1);
	var _media;
	if(_isVideo) _media = new ResponsiveVideo(_me, _rel); 
	else _media = new ResponsiveImg(_me, _rel); 
	
	//Load observer and fadein observer
	function inLoadView(){
		_media.inLoadView();
	}
	function outLoadView(){
		_media.outLoadView();
	}
	var _loadObserver;
	if(_isVideo) _loadObserver = new Observer(_me, .25, 0, inLoadView, outLoadView); //Loaded when they are within 1/4 screenheight away
	else{
		if((_horizontal || _delayed) && !GLB._isMobile) _loadObserver = new Observer(_me, 0, 0, inLoadView, outLoadView); //Loaded when they are within 1 screenheights away
		else _loadObserver = new Observer(_me, 1, 0, inLoadView, outLoadView); //Loaded when they are within 1 screenheights away
		//if(GLB._iOS && GLB._hasTouch && !GLB._isMobile && !GLB._isBot) inLoadView(); //Special for this website: iPads don't render image area before the source has been set!
	}

	//Used for IE object-fit
	_this.contain = function(){
		_media.contain();
	}

	_this.destroy = function(){
		GLBEvents(window, "betweenBreakpoint", setRel, false);
		_loadObserver.destroy();
		_loadObserver = null;
		_me.removeChild(_rel);
		_media.destroy();
		_media = null;
		_rel = null;
	}
}
//Shifts between mobile/desktop image
function ResponsiveImg(_el, _alternativeParent){
	var _this = this;
	var _urls = (_el.getAttribute("data-src") || "").split("|");
	var _alt = (_el.getAttribute("data-alt") || "");
	var _bgColor = (_el.getAttribute("data-bg") || "");
	if(_bgColor != "") _el.style.backgroundColor = _bgColor;
	var _loadInit = false, _hasVersions = (_urls.length > 1), _animTimer;
	var _curImg, _baseImg, _mobileImg;
	var _parent = _el;
	var _sizes = (_el.getAttribute("data-rel") || "").split(",");
	var _horizontal = false;
	if(_el.className.indexOf("hori") != -1) _horizontal = true;
			
	if(_alternativeParent) _parent = _alternativeParent;
	function createBaseImg(){
		var _w = null, _h = null;
		if(_horizontal){
			_w = _sizes[0] || null;
			_h = _sizes[1] || null;
		}
		if(!_baseImg) _baseImg = new GLBImage(_urls[0], _parent, _w, _h, "img fade", loaded, true, _alt);//base/desktop
		_curImg = _baseImg;
	}
	function createMImg(){
		var _w = null, _h = null;
		if(_horizontal){
			_w = _sizes[2] || _sizes[0] || null;
			_h = _sizes[3] || _sizes[1] || null;
		}
		if(!_mobileImg) _mobileImg = new GLBImage(_urls[1], _parent, _w, _h, "img fade", loaded, true, _alt);//mobile
		_curImg = _mobileImg;
	}
	function loaded(){
		if(GLB._isIE && GLB._ieVersion <= 11) objectFitImages(_curImg.img);
		clearTimeout(_animTimer);
		if(_bgColor != "") _animTimer = setTimeout(animIn, 400); //in view or loaded (because betweenBreakpoint fired)
		else _animTimer = setTimeout(animIn, 50); //in view or loaded (because betweenBreakpoint fired)
	}

	function animIn(){
		_curImg.img.classList.add("in");
		_animTimer = setTimeout(animInOver, 850);
	}
	function animInOver(e){
		if(_curImg) _curImg.img.classList.add("complete");
		else console.log("No curimage", _urls);
	}
	
	var _needsAdding = true;
	function addFirst(){
		if(!_needsAdding) return;
		_needsAdding = false;
		if(_hasVersions){
			if(GLB._isMobile) createMImg();
			else createBaseImg();
			//Now start listening
			GLBEvents(window, "betweenBreakpoint", switchImg, true);
		}
		else createBaseImg(); //Load the one defined
	}
	if(_horizontal) addFirst();

	//Load triggered from parent
	_this.inLoadView = function(){
		if(_loadInit) return;
		_loadInit = true;
		addFirst();
		_curImg.load();
	}
	_this.outLoadView = function(){}
	_this.contain = function(){
		if(!_curImg) return;
		if(GLB._isIE && GLB._ieVersion <= 11){
			//console.log("Fix object-fit", _curImg.img);
			objectFitImages(_curImg.img);
		}
	}

	function switchImg(e){
		//console.log("switchImg", _urls);
		_curImg.remove(); //Remove current
		if(GLB._isMobile) createMImg();
		else createBaseImg();
		_curImg.load();
	}
	
	_this.destroy = function(){
		//console.log("Destroy:", _urls[0])
		clearTimeout(_animTimer);
		if(_baseImg){
			_baseImg.destroy();
			_baseImg = null;
		}
		if(_mobileImg){
			_mobileImg.destroy();
			_mobileImg = null;
		}
		_curImg = null;
		_parent = null;
		GLBEvents(window, "betweenBreakpoint", switchImg, false);
	}
}

function ResponsiveVideo(_el, _alternativeParent){
	var _this = this;
	var _urls = (_el.getAttribute("data-src") || "").split("|");
	var _loaded = false, _hasVersions = (_urls.length > 1);
	var _parent = _el;
	if(_alternativeParent) _parent = _alternativeParent;

	//Create one player (and change src when needed)
	var _video = document.createElement("video");
	_video.className = "img fade";

	//Load poster (because preview of video doesn't appear in Safari)
	if(_el.getAttribute("data-poster")) _video.preload = "none", _video.poster = _el.getAttribute("data-poster");
	else _video.preload = "metadata";
	_video.muted = true, _video.autoplay = true;
	_video.controls = false;
	_video.loop = true;
	_video.setAttribute('playsinline', 'true'); // must be set before src is set or it will be ignored
	_video.playsinline = true;
	var _srcMp4 = document.createElement("source"); 
	_srcMp4.type = "video/mp4";

	function setSrc(e){
		if(GLB._isMobile) _srcMp4.src = _urls[1];
		else _srcMp4.src = _urls[0];
		_video.appendChild(_srcMp4);
	}
	_parent.appendChild(_video);

	//Load triggered from parent
	_this.inLoadView = function(){
		if(!_loaded){
			_loaded = true;
			if(_hasVersions){
				setSrc();
				//Now start listening
				GLBEvents(window, "betweenBreakpoint", setSrc, true);
			}
			else{
				_srcMp4.src = _urls[0]; //Load the one defined
				_video.appendChild(_srcMp4);
			}
			_video.classList.add("in");
		}		
		_video.play();
	}
	_this.outLoadView = function(){
		_video.pause();
	}

	_this.destroy = function(){
		_parent.removeChild(_video);
		if(_video){
			_srcMp4.src = "";
			if(_video.contains(_srcMp4)) _video.removeChild(_srcMp4);
			_video.pause();
			_video = null;
			_srcMp4 = null;
		}
		_parent = null;
		GLBEvents(window, "betweenBreakpoint", setSrc, false);
	}
}

function TxtFade(_me){
	var _this = this;
	_me.classList.add("txtfade");

	var _delayed = (_me.className.indexOf("delayed") != -1);
	var _delay = .2;
	if(_delayed) _delay = .5;
	
	var _timer;
	function inView(){
		_timer = setTimeout(animIn, _delay*1000);
	}
	function animIn(){
		_me.classList.add("in");
	}
	var _observer = new Observer(_me, 0, .25, inView);
	_this.destroy = function(){
		clearTimeout(_timer);
		_observer.destroy();
		_observer = null;
	}
}

function PersonDetails(_me){
	var _this = this;
	var _overlay;
	if(_me.className.indexOf("unfold") == -1) GLBEvents(_me, "click", clicked, true);
	function clicked(e){
		if(_overlay) _overlay.destroy();
		_overlay = new PersonOverlay(_me);
	}

	_this.destroy = function(){
		GLBEvents(_me, "click", clicked, false);
		if(_overlay){
			_overlay.destroy();
			_overlay = null;
		}
	}
}
function PersonOverlay(_ref){
	var _this = this;
	var _me = document.createElement("div");
	_me.className = "m personDetails faded";
	var _inner = document.createElement("div");
	_inner.className = "inner";
	var _l = _ref.getElementsByClassName("l")[0].cloneNode(true);
	var _img = _l.getElementsByClassName("img")[0] || null;
	if(_img) _img.classList.add("in");//make sure image shows (if not loaded yet in reference)
	var _r = _ref.getElementsByClassName("r")[0].cloneNode(true);
	_inner.appendChild(_l), _inner.appendChild(_r);
	_me.appendChild(_inner);
	var _closeBtn = document.createElement("button");
	_closeBtn.className = "closeBtn";
	_closeBtn.setAttribute("title", "Close");
	_closeBtn.textContent = "CLOSE";
	_me.appendChild(_closeBtn);

	var _animOut = false;
	function close(e){
		if(_animOut) return;
		_animOut = true;
		_me.classList.add("faded");
		_timer = setTimeout(animedOut, 350);
	}
	function kd(e){
		if(e.key == "Escape") close();
	}
	GLBEvents(_closeBtn, "click", close, true);
	GLBEvents(window, "keydown", kd, true);

	document.body.appendChild(_me);
	var _timer = setTimeout(animIn, 50);
	function animIn(){
		_me.classList.remove("faded");
		document.body.classList.add("hidetoggle");
	}
	function animedOut(){
		document.body.removeChild(_me);
		document.body.classList.remove("hidetoggle");
	}

	_this.destroy = function(){
		if(!_animOut) animedOut();
		clearTimeout(_timer);
		GLBEvents(_closeBtn, "click", close, false);
		GLBEvents(window, "keydown", kd, false);
	}
}

var _numAudiosOnPage = 0;
function ProjectAudio(_me){
	var _this = this;
	_this._progress = 0;
	_numAudiosOnPage++;

	var _label = _me.parentNode.getElementsByClassName("audiolabel")[0].textContent;
	var _menuBtn = new FixedSoundBtn(toggle, _label);
	var _added = false;
	
	//Create audio file
	var _audio = document.createElement("audio");
	_audio.controls = false;
	_audio.loop = false;
	_audio.muted = false;
	_audio.autoplay = false;
	_audio.preload = "none";
	GLBEvents(_audio, "ended", audioEnded, true);
	var _url = _me.getAttribute("data-src");
	var _src = document.createElement("source");
	_src.setAttribute("type", "audio/mpeg");
	_src.setAttribute("src", _url);
	_audio.appendChild(_src);

	function inView(){
		_menuBtn.hide();
	}
	function outView(){
		if(_numAudiosOnPage <= 1 || _playing) _menuBtn.show();
	}
	var _observer = new Observer(_me, 0, 0, inView, outView);

	var _canvas = _me.getElementsByClassName("progress")[0];
	var _size = _canvas.offsetWidth-2;//needed because Our Story uses audio in a smaller button
	if(_size < 0) _size = 62;
	_canvas.width = _canvas.height = _size*2+2;
    var _ctx = _canvas.getContext('2d');
    _ctx.strokeStyle = "#ADA89A";
	_ctx.lineWidth = "2";	
	
	var _playing = false;
	var _renderInterval;
	function toggle(e){
		_playing = !_playing;
		gsap.killTweensOf(_this);
		if(_playing){
			if(!_added){
				_added = true;
				_menuBtn.add();
			}
			_me.classList.add("interacted");
			_me.classList.add("playing");
			_menuBtn.playing();
			_audio.play();
			_renderInterval = setInterval(refreshProgress, 1000/30);
			window.dispatchEvent(new GLBEvent("playAudio", _url));
		}
		else{
			_me.classList.remove("playing");
			_menuBtn.paused();
			_audio.pause();
			clearInterval(_renderInterval);
		}
	}
	function audioEnded(e){
		_audio.currentTime = 0;
		if(_playing) toggle();
		gsap.to(_this, 1, {_progress:0, ease:"cubic.inOut", onUpdate:draw});//Tween progress back to zero
	}
	
	function refreshProgress(){
		if(isNaN(_audio.duration)) return;
		var _d = _audio.duration || 3;//default to on minute
		_this._progress = _audio.currentTime/_d;
		if(_this._progress < 0) _this._progress = 0;
		else if(_this._progress > 1) _this._progress = 1;
		draw();
	}
	function draw(){
		_ctx.clearRect(0,0,_size*2+2,_size*2+2);
		_ctx.beginPath();
		_ctx.arc(_size+1, _size+1, _size, 0,  (Math.PI*2) * _this._progress);
		_ctx.stroke();
	}

	GLBEvents(_me, "click", toggle, true);

	//Global audio event - check if this should be paused
	function audioPlaying(e){
		if(e.detail != _url && _playing){
			//console.log("Pause", _url);
			toggle(e);
			if(_numAudiosOnPage > 1) _menuBtn.hide();
		}
	}
	GLBEvents(window, "playAudio", audioPlaying, true);
	
	_this.destroy = function(){
		_numAudiosOnPage--;
		gsap.killTweensOf(_this);
		_menuBtn.destroy();
		_menuBtn = null;
		GLBEvents(_audio, "ended", audioEnded, false);
		if(_playing) _audio.pause();
		GLBEvents(_me, "click", toggle, false);
		GLBEvents(window, "playAudio", audioPlaying, false);
		clearInterval(_renderInterval);
		_observer.destroy();
		_observer = null;
		
	}
}
function FixedSoundBtn(_callback, _label){
	var _this = this;
	var _added = false;

	var _me = document.createElement("div");
	_me.className = "fixedSoundBtn";
	var _speaker = document.createElement("div");
	_speaker.className = "speaker";
	_me.appendChild(_speaker);
	var _name = document.createElement("p");
	_name.className = "name";
	_name.textContent = _label;
	_me.appendChild(_name);
	var _toggleBtn = document.createElement("button");
	_toggleBtn.className = "toggleBtn";
	_toggleBtn.setAttribute("title", "Toggle sound");
	_toggleBtn.setAttribute("aria-label", "Toggle sound");
	var _icon = document.createElement("span");
	_icon.className = "icon";
	_toggleBtn.appendChild(_icon);
	_me.appendChild(_toggleBtn);

	_this.playing = function(){
		_me.classList.add("playing");
	}
	_this.paused = function(){
		_me.classList.remove("playing");
	}
	_this.show = function(){
		_me.classList.add("on");
	}
	_this.hide = function(){
		_me.classList.remove("on");
	}

	var _fullW = 50;
	function over(e){
		if(GLB._isMobile) return;
		_fullW = _me.scrollWidth;
		_me.style.maxWidth = _fullW + "px";
	}
	function out(e){
		if(GLB._isMobile) return;
		_me.style.maxWidth = _fullW - 40 + "px";
	}
	GLBEvents(_me, "mouseenter", over, true);
	GLBEvents(_me, "mouseleave", out, true);
	

	function toggleClick(e){
		_callback.call(e);
	}
	GLBEvents(_toggleBtn, "click", toggleClick, true);

	_this.add = function(){
		_added = true;
		document.body.appendChild(_me);
		if(!GLB._isMobile){
			_fullW = _me.scrollWidth;
			_me.style.maxWidth = _fullW - 40 + "px";
		}
	}
	_this.destroy = function(){
		if(_added){
			_added = false;
			document.body.removeChild(_me);
		}
		GLBEvents(_me, "mouseenter", over, false);
		GLBEvents(_me, "mouseleave", out, false);
		GLBEvents(_toggleBtn, "click", toggleClick, false);
	}
}
function HomeTime(_me){
	var _this = this;

	//Letter anim
	var _title = _me.getElementsByTagName("h1")[0];
	var _type = "chars", _splittext;
	if(!GLB._isBot){
		_splittext = new SplitText(_title, {type:_type});
		_chars = _splittext.chars, _numChars = _chars.length;
		for(var i=0;i<_numChars;i++){
			gsap.set(_chars[i], {force3D:true, x:32, opacity:0});
			gsap.to(_chars[i], 1, {force3D:true, x:0, opacity:1, ease:"cubic", delay:.5+i*.1});
		}
	}
	function clickedHome(e){
		window.dispatchEvent(new GLBEvent("openMenu"));
	}
	GLBEvents(_title, "click", clickedHome, true);
	
	var _now = new Date();
	var _greetingsDiv = _me.getElementsByClassName("greetings")[0];
	var _greetings = _greetingsDiv.getElementsByTagName("h3");
	var _images = _me.getElementsByClassName("lazy");
	var _time = _me.getElementsByClassName("time")[0];
	var _p = _time.getElementsByTagName("p")[0];
	var _bar = _time.getElementsByClassName("bar")[0];
	var _knob = _time.getElementsByClassName("knob")[0];
	var _w = 0, _progress = 0, _twx = 0, _greetingId = 0, _prevGreetingId = -1, _z = 1, _inTimer, _autoSpeedMax = .0004;
	_this._autoSpeed = 0;
	
	function refreshTime(){
		var _hours = _now.getHours();
		var _minutes = _now.getMinutes();
		//_hours = 11;
		//_minutes = 20;
		if(!_wasTouhed){
			_progress = (_hours + _minutes/60)/24;
			if(_hours == 0) _progress = 1;
			moveKnob();
		}
		var _am = "am";
		if(_minutes < 10) _minutes = "0"+_minutes;
		if(_hours >= 12) _am = "pm";
		if(_hours > 12) _hours -= 12;
		_p.textContent = _hours + ":" + _minutes + " " + _am;
	}
	function moveKnob(){
		//Decide image and greeting
		//console.log(_progress);
		if(_progress < .37) _greetingId = 0;//morning
		else if(_progress < .475) _greetingId = 1;//morning
		else if(_progress <= .65) _greetingId = 2;//lunch
		else if(_progress <= .8) _greetingId = 3;//afternoon
		else _greetingId = 4;//evening
		if(_prevGreetingId == _greetingId) return;
		if(_prevGreetingId != -1){
			//_greetings[_prevGreetingId].classList.remove("active");
			_images[_prevGreetingId].classList.remove("in");
			//Remove user's current time
			_greetingsDiv.classList.add("fade");
			_p.classList.add("fade");
		}
		else _greetings[_greetingId].classList.add("active");
		_prevGreetingId = _greetingId;
		_images[_greetingId].classList.add("active");
		_images[_greetingId].style.zIndex = _z;
		_z++;
		_inTimer = setTimeout(animInImg, 50);
	}
	function animInImg(){
		_images[_greetingId].classList.add("in");
	}
	function engine(){
		_twx += (_progress*_w - _twx) * .3;
		gsap.set(_knob, {x:_twx, force3D:true});
	}
	
	var _offx = 0, _x = 0, _touched = false, _wasTouhed = false;
	function md(e){
		_touched = true;
		_wasTouhed = true;
		GLBEvents(window, "mouseup", mup, true);
		GLBEvents(window, "touchend", mup, true);
		resized();
		_time.classList.add("dragging");
		gsap.killTweensOf(_this);
		_this._autoSpeed = 0;
	}
	function mmove(e){
		if(!_touched) return;
		if(e.type == "touchmove"){
			_x = e.touches[0].clientX - _offx;
			e.preventDefault();
			e.stopPropagation();
		}
		else _x = e.clientX - _offx;
		if(_x < 0) _x = 0;
		else if(_x > _w) _x = _w;
		_progress = _x / _w;
		moveKnob();
	}
	function mup(e){
		_touched = false;
		GLBEvents(window, "mouseup", mup, false);
		GLBEvents(window, "touchend", mup, false);
		_time.classList.remove("dragging");
		setSpeed();
	}
	function resized(){
		_offx = _time.offsetLeft,  _w = _bar.offsetWidth;
	}
	GLBEvents(_knob, "mousedown", md, true);
	GLBEvents(window, "mousemove", mmove, true);
	if(GLB._hasTouch){		
		GLBEvents(_knob, "touchstart", md, true);
		_knob.addEventListener("touchmove", mmove, {passive:false});
	}
	function setSpeed(){
		gsap.killTweensOf(_this);
		gsap.to(_this, 2, {_autoSpeed:_autoSpeedMax, ease:"cubic.inOut", delay:3});
	}
	setSpeed();
	resized();
	refreshTime();
	gsap.ticker.add(engine);
	_twx = _progress*_w;//instant

	//Slideshow function
	function slideshowEngine(){
		if(_touched) return;
		_progress += _this._autoSpeed;
		if(_progress > 1){
			_progress = 0;
			_twx = _progress*_w;//instant
		}
		moveKnob();
	}
	gsap.ticker.add(slideshowEngine);
	

	_this.destroy = function(){
		gsap.ticker.remove(engine);
		gsap.ticker.remove(slideshowEngine);
		gsap.killTweensOf(_this);
		clearTimeout(_inTimer);
		GLBEvents(_title, "click", clickedHome, false);
		GLBEvents(_knob, "mousedown", md, false);
		GLBEvents(window, "mousemove", mmove, false);
		if(GLB._hasTouch){		
			GLBEvents(_knob, "touchstart", md, false);
			_knob.removeEventListener("touchmove", mmove, {passive:false});
		}
		if(!GLB._isBot){
			for(var i=0;i<_numChars;i++) gsap.killTweensOf(_chars[i]);
		}
	}
}

function TitleAnim(_me){
	var _this = this;
	var _title = _me.getElementsByTagName("h1")[0] || _me.getElementsByTagName("h2")[0] || null;
	var _type = "words,chars", _splittext, _chars, _numChars = 0;
	var _delay = .1;
	if(_title && !GLB._isBot){
		if(_title.nodeName == "H2") _delay = .3;
		_splittext = new SplitText(_title, {type:_type});
		_chars = _splittext.chars, _numChars = _chars.length;
		for(var i=0;i<_numChars;i++) gsap.set(_chars[i], {force3D:true, x:32, opacity:0});
	}
	function inView(){
		if(!_title) return;
		for(var i=0;i<_numChars;i++) gsap.to(_chars[i], .6, {force3D:true, x:0, opacity:1, ease:"cubic", delay:_delay+i*.05});
	}
	var _observer = new Observer(_me, 0, 0, inView); //Loaded when they are within 1 screenheights away
	_this.destroy = function(){
		_observer.destroy();
		_observer = null;
		if(_title){
			for(var i=0;i<_numChars;i++) gsap.killTweensOf(_chars[i]);
		}
	}
}

function ProjectIntro(_me){
	var _this = this;
	var _p = _me.getElementsByTagName("p")[0];
	_p.classList.add("delayed");
	var _f = new TxtFade(_p);
	_this.destroy = function(){
		_f.destroy();
		_f = null;
	}
}
//Parallax
function Parallax(_me){
	var _this = this;
	var _inView = false, _layoutTimer, _scrolledLocal, _offset, _offPos;
	var _speed = parseFloat(_me.getAttribute("data-speed"));
	var _target = _me.getElementsByClassName("lazy")[0] || _me;
			
	function inView(){
		_inView = true;
		gsap.ticker.add(scrolled);
		scrolled();
	}
	function outView(){
		_inView = false;
		gsap.ticker.remove(scrolled);
	}
	
	function scrolled(){
		if(GLB._hasTouch || GLB._isMobile) return;
		_scrolledLocal = _offset - document.documentElement.scrollLeft;		
		_offPos = _scrolledLocal * _speed;
		if(_speed > 0){
			//Measure from center instead
			_offPos = (_offset - document.documentElement.scrollLeft) * _speed;
		}
		gsap.set(_target, {x:_offPos, force3D:true});
	}

	function layout(e){
		if(GLB._isMobile) return;
		clearTimeout(_layoutTimer);
		_offset = _me.offsetLeft;// + 100 - GLB._vw/2;
		if(_speed > 0) _offset += GLB._reliableSh/2;
	}
	function relayout(){
		layout();
		if(_inView) scrolled();
	}
	function betweenBreakpoint(e){
		if(GLB._isMobile) gsap.set(_target, {x:0, force3D:true, clearProps:"transform"});
	}
    if(GLB._hasIntersectionObs){
        GLBEvents(window, "LayoutUpdate", layout, true);
		GLBEvents(window, "betweenBreakpoint", betweenBreakpoint, true);
		layout(null);
		_layoutTimer = setTimeout(relayout, 100);
	}
	var _observer = new Observer(_me, .5, 0, inView, outView);

	_this.destroy = function(){
		clearTimeout(_layoutTimer);
		GLBEvents(window, "LayoutUpdate", layout, false);
		GLBEvents(window, "betweenBreakpoint", betweenBreakpoint, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
	}
}

function ProjectsEdge(_me){
	var _this = this;
	var _darkEdge = document.createElement("div");
	_darkEdge.className = "darkedge";
	var _inner = document.createElement("div");
	_inner.className = "inner";
	_darkEdge.appendChild(_inner);
	var _marker = document.createElement("div");
	_marker.className = "marker";
	_darkEdge.appendChild(_marker);
	_me.parentNode.appendChild(_darkEdge);

	/*var _imgMask = document.createElement("div");
	_imgMask.className = "imgMask";
	_me.getElementsByClassName("lazy")[0].appendChild(_imgMask);
	gsap.set(_imgMask, {opacity:.1, scaleX:0, transformOrigin:"100% 0", force3D:true});*/
	
	var _timer, _on = false;

	function inView(){
		if(GLB._isMobile) return;
		_on = true;
		clearTimeout(_timer);
		_darkEdge.classList.add("on");
		gsap.killTweensOf(_inner);//, gsap.killTweensOf(_imgMask);
		gsap.to(_inner, 5, {x:0, force3D:true, ease:"quad.in", delay:.1, onComplete:gotoNext});
		//gsap.to(_imgMask, 5, {opacity:.95, scaleX:1, transformOrigin:"100% 0", force3D:true, ease:"quad.in", delay:.1});
	}
	function gotoNext(){
		_router.setUrl(_me.getAttribute("href"));
	}
	function outView(){
		if(GLB._isMobile && !_on) return;
		_on = false;
		_darkEdge.classList.remove("on");
		_timer = setTimeout(outOver, 1000);
		gsap.killTweensOf(_inner);//, gsap.killTweensOf(_imgMask);
		gsap.to(_inner, 1, {x:GLB._vwOuter*1.9, force3D:true, ease:"quad.inOut"});
		//gsap.to(_imgMask, 1, {opacity:.1, scaleX:0, transformOrigin:"100% 0", force3D:true, delay:.1, ease:"quad.inOut"});
	}
	function outOver(){
		gsap.set(_inner, {x:GLB._vwOuter*1.9, force3D:true})
	}
	var _observer = new Observer(_marker, 0, 0, inView, outView);
	
	_this.destroy = function(){
		gsap.killTweensOf(_inner);//, gsap.killTweensOf(_imgMask);
		_observer.destroy();
		_observer = null;
	}
}

var _firstFormLoad = true;
function ProjectForm(_me){
	var _this = this;

	var _submitBtn = _me.querySelector("input[type=submit]");
	var _thankyou = document.createElement("div");
	_thankyou.className = "thankyouOverlay";
	var _p = document.createElement("h2");
	_p.innerHTML = "Thank you for submitting your thoughts on your project.<br /><br />We will be in touch with you soon to discuss further.";	
	_thankyou.appendChild(_p);
	var _closeTimer, _thankyouOn = false, _dropzone;

	function createDropzone(){
		_dropzone = Dropzone.options.mydropzone = {
			addRemoveLinks: true,
			autoProcessQueue: false, // this is important as you dont want form to be submitted unless you have clicked the submit button
			uploadMultiple: true,
			acceptedFiles: ".jpeg,.jpg,.png",
			maxFilesize:3,parallelUploads: 8,maxFiles: 8,
			paramName: "file",
			autoDiscover: false,
			previewsContainer: "#dropzonePreview", // we specify on which div id we must show the files
			clickable: "#dropzonePreview", // this tells that the dropzone will not be clickable . we have to do it because v dont want the whole form to be clickable 
			accept: function(file, done) {
				console.log("uploaded");
				done();
			},
			error: function(file, msg){
				console.log("error: "+msg);
			},
			init: function() {
				var myDropzone = this;
				//now we will submit the form when the button is clicked
				GLBEvents(_submitBtn, "click", submitForm, true);
				function submitForm(e){
					document.body.classList.add("spinner");
					GLBEvents(_submitBtn, "click", submitForm, false);
					if(myDropzone.getQueuedFiles().length > 0){
						console.log("Has images to upload");
						e.preventDefault();
						myDropzone.on("queuecomplete", function (file) {
							completed();
						});
						myDropzone.processQueue();  // this will submit your form to the specified action path
					}
					else completed();
				}
			}
		}
	}
	
	function completed(){
		//console.log("completed")
		document.body.classList.remove("spinner");
		_me.classList.add("completed");
		document.body.appendChild(_thankyou);
		setTimeout(animIn, 50);
		_closeTimer = setTimeout(closeThankyou, 10000);
		_thankyouOn = true;
	}
	function animIn(){
		_thankyou.classList.add("in");
		GLBEvents(window, "click", closeThankyou, true);
	}
	function closeThankyou(){
		_thankyou.classList.remove("in");
		clearTimeout(_closeTimer);
		_closeTimer = setTimeout(closeThankyouB, 500);
		GLBEvents(window, "click", closeThankyou, false);
	}
	function closeThankyouB(){
		document.body.removeChild(_thankyou);
		_thankyouOn = false;
	}

	//document.body.classList.add("spinner");//debug
	//setTimeout(completed, 1000)//debug

	//Add Dropzone js
	if(_firstFormLoad){
		_firstFormLoad = false;
		var _js = document.createElement("script");
		_js.async = _js.defer = true;
		_js.setAttribute("src", "https://unpkg.com/dropzone@5/dist/min/dropzone.min.js");
		_js.onload = createDropzone;
		document.head.appendChild(_js);
	}
	else location.reload(); //otherwise Dropzone wont work again!

	_this.destroy = function(){
		Dropzone.options.mydropzone.error = {};
		Dropzone.options.mydropzone.accept = {};
		Dropzone.options.mydropzone.init = {};
		if(Dropzone.instances.length > 0){
			Dropzone.instances.forEach(bz => bz.destroy());
		}
		Dropzone.options.mydropzone = null;
		GLBEvents(window, "click", closeThankyou, false);
		if(_thankyouOn) document.body.removeChild(_thankyou);
		clearTimeout(_closeTimer);
		_submitBtn = null;
	}
}