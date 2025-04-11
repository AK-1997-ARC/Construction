/*		v 0.7 - revised 3/10 2022 ILTP		*/
function Main(){
	_menu = new MainMenu();
	_pageTransition = new PageTransition();
	//Scrolling method
	/*var _scroller;
	if(GLB._hasTouch) _scroller = new TouchscrollHelper(); //no Smoothscroll (but touch screen)
	else _scroller = new Smoothscroll();//has external mouse / visible scrollbar
	*/
	//Scrolling method
	var _scroller;
	if(GLB._hasTouch) _scroller = new TouchscrollHelper(); //no Smoothscroll (but touch screen)
	else _scroller = new Smoothscroll();//has external mouse / visible scrollbar
	if(!GLB._hasTouch && !GLB._isMobile) document.body.classList.add("parallaxing");//Adjust margins for desktop parallax version

	//Page management
	_pages = [];
	var _main = document.getElementsByTagName("main")[0];
	_pageDiv = _main.getElementsByClassName("page")[0]; //Always the first page (SSR)
	var _activePage, _path, _prevFetch, _firstLoad = true;
	function pageChanged(e){
		_path = _router.getFullUrl();
		//Detect forms overlays (these are triggered by url change, so they are catched here)
		if(_path == "" || _path == "/") _path = "home";
		//First page is server-side rendered (and we don't need the pagetransition)
		if(_firstLoad){
			_firstLoad = false;
			buildNewPage();
			return;
		}
		loadPage(_path);
	}
	function loadPage(_path){
		_scroller.removeOldPage();
		GLBEvents(window, "readyForNewPage", readyForNewPage, false);
		if(_prevFetch) _prevFetch.invalid();
		//Delete old (cache) content
		if(_pages[_path] != undefined){
			if(_prefetches[_path]) _prefetches[_path].dispose();
			_pages[_path] = null, _prefetches[_path] = null;
		}
		if(_prefetches[_path] == undefined) _prefetches[_path] = new Prefetch(_path, true); //Load or reload
		_prevFetch = _prefetches[_path];
		_prefetches[_path].getContent(appendNewPage);
	}
	//Callback when content is fetched
	function appendNewPage(){
		GLBEvents(window, "readyForNewPage", readyForNewPage, true);
		_pageTransition.anim(_menu._menuOpen);
	}
	//Callback from pagetransition
	function readyForNewPage(){
		GLBEvents(window, "readyForNewPage", readyForNewPage, false);
		if(_main.contains(_pageDiv)) _main.removeChild(_pageDiv);
		if(_activePage) _activePage.stop(), _activePage = null;
		_main.appendChild(_prefetches[_path]._content);
		_router.newHead(_prefetches[_path]._head);
		buildNewPage();
	}

	function buildNewPage(){
		_pageDiv = _main.getElementsByClassName("page")[0];
		if(_pages[_path] == undefined) _pages[_path] = new PageBase(_pageDiv);
		_activePage = _pages[_path];
		_activePage.start();
		_scroller.newPage();
		_menu.select(_path.split("/")[0]);
		_router.newPage();
	}
	
	GLBEvents(window, "pageChange", pageChanged, true);
	pageChanged(null);

	document.body.classList.add("animates"); //Enable css transitions
}
//Loader for all external (static) html
function Prefetch(_path, _alive){
	//console.log("New prefetch for:", _path, _alive);
	var _this = this;
	_this._content = "";
	_this._head = "";
	var _loaded = false;
	var _req, _callback;

	//Make sure callback is not called, because another page is now used (maybe browsing quickly)
	_this.invalid = function(){
		_callback = null;
	}
	//Define callback for load complete
	_this.getContent = function (_cb){
		_callback = _cb;
		if(_loaded && _this._content != "") doCb(); //Get from cache in Prefetch
	}
	//Worker callback (async)
	_this.parsed = function (c){
		_this._content = c;
		doCb();
	}
	_this.dispose = function(){
		_callback = null;
		_this._content = null;
		_this._head = null;
		if(_req){
			_req.abort();
			_req = null;
		}
	}

	function XHR(){
		if(window.XMLHttpRequest) _req = new XMLHttpRequest();
		else if(window.ActiveXObject) _req = new ActiveXObject("Microsoft.XMLHTTP");
		try {
			_req.onreadystatechange = ready;
			if(_path == "search"){
				_path += window.location.search; //Add query
				if(_path.indexOf("?") == -1) _req.open("GET", "/" + _path + "/", true); //normal page
				else _req.open("GET", "/" + _path, true); //with search query
			}
			else if(_path == "404.htm") _req.open("GET", "404.html", true);
			//else if(_path == "home") _req.open("GET", "/index.html", true);
			//else _req.open("GET", "/" + _path + "/index.html", true);
			else if(_path == "home") _req.open("GET", "/index.html?cache_"+_cacheTime, true);
			else _req.open("GET", "/" + _path + "/index.html?cache_"+_cacheTime, true);
			_req.send();
		}
		catch (e){ }
	}
	function ready(){
		if(_loaded) return;
		if(_req.readyState != 4) return;
		//Error (but not 404), try reloading after small delay
		if(_req.status != 200 && _req.status != 404){
			console.log("Error loading content for:", _path);
			_req.abort();
			_req = null;
			setTimeout(XHR, 1000);
			return;
		}
		var _parser = new DOMParser();
		var _dom = _parser.parseFromString(_req.responseText, "text/html");
		_this._content = _dom.getElementsByClassName("page")[0];
		_this._head = _dom.head;
		
		_req.abort();
		_req = null;
		_loaded = true;
		doCb();
	}
	function doCb(){
		if(_callback) _callback.call(), _callback = null; //Callback is defined when it's needed ("invalid" is called when changing to another page)
	}
	if(_alive) XHR();
}

function PageTransition(){
	var _this = this;
	var _me = document.getElementsByClassName("pageTransition")[0];
	var _on = false;
	var _timeout, _time = 500;//300 for own fade, another 200 for loading subpage
	
	function establish(){
		_me.classList.add("loaded");
	}
	_timeout = setTimeout(establish, 100);

	_this.anim = function(_menuOpen){
		clearTimeout(_timeout);
		_on = true;
		document.body.appendChild(_me);
		if(_menuOpen){
			//console.log("menu is open");
			animOut();
			return;
		}
		_timeout = setTimeout(animIn, 50);
	}
	function animIn(){
		_me.classList.add("in");
		_timeout = setTimeout(animOut, _time); //Give it a little time for loading first image
		window.dispatchEvent(new GLBEvent("forcecloseMenu"));
	}
	function animOut(){
		window.dispatchEvent(new GLBEvent("readyForNewPage"));
		_me.classList.remove("in");
		clearTimeout(_timeout);
		_timeout = setTimeout(animOutOver, 1000);
	}
	function animOutOver(){
		if(!_on) return;
		_on = false;
		document.body.removeChild(_me);
	}
}

function MainMenu(){
	var _this = this;
	var _header = document.getElementsByTagName("header")[0];
	var _toggle = _header.getElementsByClassName("toggle")[0];
	var _toggleDefaultLabel = _toggle.textContent;
	_toggle.textContent = "";
	var _toggleLabel = document.createElement("span");
	_toggleLabel.className = "label";
	_toggleLabel.textContent = _toggleDefaultLabel;
	_toggle.appendChild(_toggleLabel);
	var _burger = document.createElement("span");
	_burger.className = "burger";
	_toggle.appendChild(_burger);
	var _nav = _header.getElementsByTagName("nav")[0];
	var _logo = _header.getElementsByClassName("logo")[0];
	var _logolink = overWriteLink(_logo);

	//Animated background
	var _bg = document.createElement("div");
	_bg.className = "bg";
	_header.appendChild(_bg);

	function resized(e){
		var _screenH = GLB._vh;
		if(GLB._isMobile) _screenH = Math.max(GLB._vh, screen.height);
		var _size = Math.sqrt(Math.pow(GLB._vwOuter/2,2) + Math.pow(_screenH/2,2));
		_bg.style.marginLeft = -_size + "px";
		_bg.style.marginTop = GLB._vh/2-_size + "px";
		_bg.style.width = _bg.style.height = _size*2 + "px";
	}
	GLBEvents(window, "resize", resized, true);
	resized(null);
	
	var _menuTimer;
	_this._menuOpen = false;
	
	//Menu items
	var _itemsHtml = _nav.getElementsByClassName("primary");
	var _l = _itemsHtml.length;
	var _items = [], _itemsFlat = [];
	for(var i=0;i<_l;++i){
		var _m = new MenuItem(i, _itemsHtml[i]);
		_items[_m._page] = _m;
		_itemsFlat.push(_m);
	}
	var _itemsSecondary = _nav.getElementsByClassName("secondary");
	_l = _itemsSecondary.length;
	for(i=0;i<_l;++i){
		var _m = new MenuItem(i, _itemsSecondary[i]);
		_items[_m._page] = _m;
		_itemsFlat.push(_m);
	}
	_l = _itemsFlat.length;

	var _selectedItem;
	_this.select = function(_path){
		if(_open) toggle(null); //Close menu (if open)
		if(_selectedItem == _items[_path]) return;
		if(_selectedItem) _selectedItem.unselect();
		_selectedItem = _items[_path];
		if(_selectedItem) _selectedItem.select();
	}

	var _open = false;
	function toggle(e){
		_open = !_open;
		clearTimeout(_menuTimer);
		_this._menuOpen = _open;
		if(_open){
			_bg.classList.add("moving");
			_header.classList.add("opening");
			_header.classList.add("open");
			_menuTimer = setTimeout(opened, 350);
		}
		else{
			_bg.classList.remove("moving");
			_header.classList.add("closing");
			_menuTimer = setTimeout(closed, 350);
		}
	}
	function opened(){
		_toggleLabel.textContent = "CLOSE";
		_header.classList.remove("opening");
	}
	function closed(){
		_header.classList.remove("open");
		_header.classList.remove("opening");
		_header.classList.remove("closing");
		_toggleLabel.textContent = _toggleDefaultLabel;
	}
	GLBEvents(_toggle, "click", toggle, true);

	function openMenu(e){
		if(!_open) toggle();
	}
	GLBEvents(window, "openMenu", openMenu, true);

	//Make sure to close when selecting current page in menu
	function subpageChange(e){
		if(_open) toggle(null);
	}
	GLBEvents(window, "subpageChange", subpageChange, true);

	function keyup(e){
		if(_open && e.key == "Escape") toggle(null);
	}
	GLBEvents(window, "keyup", keyup, true);
}

function MenuItem(_id, _me){
	var _this = this;
	var _link = overWriteLink(_me);
	
	//Prefetch:
	if(!GLB._hasTouch) GLBEvents(_me, "mouseenter", prefetchPage, true);
	var _href = _me.getAttribute("href");
	var _page = _href;
	//Remove first slash
	if(_page.substr(0,1) == "/") _page = _page.substr(1);
	if(_page == "") _page = "home";
	//Remove end slash
	var _l = _page.length;
	if(_page.substr(_l-1) == "/") _page = _page.substr(0, _l-1);
	_this._page = _page;

	function prefetchPage(e){
		//console.log("prefetch on hover:", _page);
		if(_prefetches[_page] == undefined) _prefetches[_page] = new Prefetch(_page, true);
		GLBEvents(_me, "mouseenter", prefetchPage, false);
	}

	_this.select = function(){
		_me.classList.add("selected");
	}
	_this.unselect = function(){
		_me.classList.remove("selected");
	}
}

/*		Router for controlling url, tracking etc. within the SPA		*/
function Router(){
	var _this = this;
	var _previousUrl = "";
	var _apiPrefix = "/", _path = "";
	var _prefix = _apiPrefix, _prefixL = _prefix.length;
	
	_this._useAPI = !!(window.history && history.pushState); //Check for History API
	if(GLB._hasTouch && (!GLB._iOS && GLB._androidVersion < 4.3 && GLB._androidVersion > 0)) _this._useAPI = false; //Detect old Android phones
	//_this._useAPI = false;//test

	//Check that deeplink (ifany) has same format
	var _firstPath = window.location.pathname;
	if(_firstPath.length > _apiPrefix.length) cleanUrl(window.location.pathname || "");

	//Respond to back/forward browser navigation
	function popstate(e){
		_cachedScroll = _cachedPageScroll;
		_cachedPageScroll = 0;//Reset
		_previousUrl = _path;//Store previous page
		if(_previousUrl.substr(0, 1) != "/") _previousUrl = "/" + _previousUrl;
		cleanUrl(window.location.pathname || "");
		if(isSubpage("/"+_path+window.location.search, false)) return; //subpage is used in projects filters
		respondToState();
	}

	//Address was changed, get the url and dispatch global pageChange event
	function respondToState(){
		cleanUrl(window.location.pathname || "");
		window.dispatchEvent(GLBEvent("pageChange"));
	}
	//Get url withouth any prefix (e.g. www.keepit.com)
	function cleanUrl(_in){
		_in = _in.toLowerCase();
		_path = removePrefix(_in).slice(0, -1);
	}
	function removePrefix(_in){
		if(_prefixL > 0) return _in.substr(_prefixL);
		else return _in;
	}
	//Compare to previous url to see if this is "just" a subpage - because we don't want a pagetransition then
	function isSubpage(_newUrl, _setUrl){
		var _newClean = _newUrl.split("?")[0];
		if(_newClean.substr(-1) == "/") _newClean = _newClean.substr(0, _newClean.length-1);
		//console.log("NEW:", _newClean, "old", _previousUrl);
		if(_newClean != "" && _newClean == _previousUrl){
			//console.log("Same page:", _newUrl);
			//Remove end slash if there are parameters
			if(_newUrl.substr(-1) == "/" && _newUrl.indexOf("?") != -1) _newClean = _newUrl.substr(0,_newUrl.length-1);
			else _newClean = _newUrl;
			//Update history
			if(_setUrl) window.history.pushState({}, "", _newClean);
			window.dispatchEvent(GLBEvent("subpageChange"));
			return true;
		}
		return false;
	}

	//Set new url
	_this.setUrl = function(_newUrl){
		if(_newUrl.indexOf("?") == -1 && _newUrl.substr(-1) != "/") _newUrl += "/";//Make sure we have a trailing slash
		_previousUrl = _path;//Store previous page
		if(_previousUrl.substr(0, 1) != "/") _previousUrl = "/" + _previousUrl;
		if(_newUrl == "" || _newUrl == "/") _newUrl = _prefix;
		_cachedPageScroll = Math.max(document.documentElement.scrollLeft, GLB._windowScrollY);
		if(_iosV && _cachedPageScroll == 0) _cachedPageScroll = document.body.scrollLeft;
		//console.log("store scroll", _cachedPageScroll);
		if(isSubpage(_newUrl, true)) return;
		window.history.pushState({}, "", _newUrl);
		respondToState();
	}
	_this.getFullUrl = function(){
		return _path;
	}
	
	//New page initiated
	_this.newPage = function(){
		_this.track(_this.getGAaPath());
	}
	_this.getGAaPath = function(){
		var _p = "/" + _path;
		if(_p != "/") _p += "/";
		return _p;
	}
	//All pageview tracking
	_this.track = function (_p){
		if(window.location.search && window.location.search != "") _p += window.location.search; //Make sure all parameters are tracked too
		if(_p == "404.htm" || _p == "404.html") return;
		//console.log("To-do: Track url", _p);
		//Normal Analytics
		/*try{
			ga('set', 'page', _p);
			ga('send', 'pageview');
		}
		catch(e){
			console.log("Couldn't track GA!");
		}*/
	}
	
	//to-do: Modify header elements (initial page always look correct from server)
	var _canonical = document.querySelector("link[rel='canonical']");//, _fbUrl = document.querySelector("meta[property='og:url']"), _fbTitle = document.querySelector("meta[property='og:title']");
	//var _metaDesc = document.querySelector("meta[name='description']"), _twDesc = document.querySelector("meta[name='twitter:description']"), _fbDesc = document.querySelector("meta[property='og:description']");

	_this.newHead = function(_head){
		try{
			var _newcanonical = _head.querySelector("link[rel='canonical']")
			_canonical.setAttribute("href", _newcanonical.getAttribute("href"));
			/*
			_fbUrl.setAttribute("content", _newcanonical.getAttribute("href"));
			var _newDesc = _head.querySelector("meta[name='description']");
			_metaDesc.content = _newDesc.content;
			_twDesc.setAttribute("content", _newDesc.content);
			_fbDesc.setAttribute("content", _newDesc.content);*/
			var _newTitle = _head.getElementsByTagName("title")[0];
			document.title = _newTitle.textContent;
			//_fbTitle.setAttribute("content", _newTitle.textContent);
		}
		catch(e){
			console.log("Error updating head");
		}
	}
	
	//Init
	respondToState(), GLBEvents(window, "popstate", popstate, true);
}

/*		Template for all pages		*/
function PageBase(_div){
	var _this = this;
	//Build custom template for the page
	//Standard modules are controlled from here (to avoid duplicate code in each page)
	var _started = false;
	
	var _modules = [["a", overWriteLink], ["lazy", LazyMedia], ["bottomtext", TxtFade], ["centertext", TxtFade], ["quote", TxtFade], ["links", TxtFade], ["person", PersonDetails], ["audio", ProjectAudio], ["home", HomeTime], ["centertext", TitleAnim], ["bottomtext", TitleAnim], ["projectintro", TitleAnim], ["projectintro", ProjectIntro], ["parallax", Parallax], ["nextproject", ProjectsEdge], ["form", ProjectForm]];
	var _numModules = _modules.length;
		
	_this.start = function(){
		if(_started) return;
		_started = true;
		//Create modules
		var _el;
		for (var i = 0; i < _numModules; i++){
			if(i < 1) _el = _div.getElementsByTagName(_modules[i][0]);
			else _el = _div.getElementsByClassName(_modules[i][0]);
			var _num = _el.length;
			_modules[i][2] = _num; //Save num
			var _instances = [];
			for (var j = 0; j < _num; j++) _instances.push(new _modules[i][1](_el[j]));
			_modules[i][3] = _instances;
		}

		//Horizontal pages (process, cases)
		if((_div.getAttribute("data-horizontal") || "false") == "true") GLB._scrollAxis = 1, document.body.classList.add("hori");
		else GLB._scrollAxis = 0;
		forceResize();
		
		//Slide in (desktop)
		if(!GLB._isMobile && _router.getFullUrl() != ""){
			if(GLB._scrollAxis == 1){
				gsap.set(_div, {x:GLB._vw/4, force3D:true});
				gsap.to(_div, 1.4, {x:0, force3D:true, ease:"quart", clearProps:"transform", onComplete:forceResize});
			}
		}
	}
	_this.stop = function(){
		if(!_started) return;
		_started = false;
		//Dispose modules
		try {
			for (var i = 0; i < _numModules; i++){
				var _num = _modules[i][2];
				for (var j = 0; j < _num; j++){
					_modules[i][3][j].destroy();
					_modules[i][3][j] = null;
				}
				_modules[i][3] = null;
			}
		}
		catch (e){
			console.log("Error disposing page!", e);
		}
	}
}

//Smooth (native) scroll
function Smoothscroll(){
	var _this = this;
	var _wS = 0, _twS = 0, _dSc = 0, _distBottom = 0, _windowW = GLB._vw, _windowH = GLB._reliableSh, _end = GLB._reliableSh, _speed = .1;
	var _fsModules, _resizeObserver, sX = 0, sY = 0, pX = 0, pY = 0, PIXEL_STEP = 10, LINE_HEIGHT = 50;//relevant for Firefox primarily
	var _resizeTimer, _whT, _render = false, _userWheeling = false, _refreshWhenStarting = false;
	var _threshold = 1;//normal screens (stop faster to avoid pixelsnapping near end of easing) - small downside: this may land 1-2px off the actual scroll position!
	if(GLB._dpi >= 2) _threshold = .5;//high density (allows half pixels in window scroll)

	function nWh(e){
		if('deltaX' in e) pX = e.deltaX;
		if('deltaY' in e) pY = e.deltaY;
		else{
			//Legacy
			if('detail'      in e) sY = e.detail;
			else if('wheelDelta'  in e) sY = -e.wheelDelta / 120;
			else if('wheelDeltaY' in e) sY = -e.wheelDeltaY / 120;
			else if('wheelDeltaX' in e) sX = -e.wheelDeltaX / 120;
			// side scrolling on FF with DOMMouseScroll
			if('axis' in e && e.axis === e.HORIZONTAL_AXIS) sX = sY, sY = 0;
			pX = sX * PIXEL_STEP, pY = sY * PIXEL_STEP;
		}
		if(!GLB._mac || GLB._firefox){
			if((pX || pY) && e.deltaMode){
				//Old browsers scrolling in lines or viewports
				if(e.deltaMode == 1) pX *= LINE_HEIGHT, pY *= LINE_HEIGHT;
				else pX *= GLB._vw, pY *= GLB._reliableSh;
			}
			else if(GLB._mac && GLB._firefox) pY *= 2;
		}
		if(GLB._firefox){
			if(pY < -300) pY = -300;
			else if(pY > 300) pY = 300;
		}
	}
	function wheeled(e){
		nWh(e);
		if(e.ctrlKey) return;
		e.stopPropagation(), e.preventDefault();
		if(GLB._scrollAxis == 1){
			if(Math.abs(pY) > Math.abs(pX)) _wS += pY;
			else _wS += pX;
			if(_wS < 0) _wS = 0;
			else if(_wS > _windowW) _wS = _windowW;
		}
		else{
			_wS += pY;
			if(_wS < 0) _wS = 0;
			else if(_wS > _windowH) _wS = _windowH;
		}
		//Need to refresh (used scrollbar or keys)
		if(!_userWheeling && _refreshWhenStarting){
			_refreshWhenStarting = false;
			if(GLB._scrollAxis == 1) _wS = _twS = GLB._windowScrollX;
			else _wS = _twS = GLB._windowScrollY;
		}
		else if((_wS == 0 && _twS == 0 && GLB._windowScrollY == 0) || (_wS == _end && _twS == _end && GLB._windowScrollY == _end)) return; //at edge of page
		_userWheeling = _render = true;
		clearTimeout(_whT);
		_whT = setTimeout(wheelOver, 1500);
	}
	function scrolled(e){
		if(!_userWheeling) _refreshWhenStarting = true;//must be scrollbar, keys etc. since wheel is not used
		//console.log("w scroll is:", GLB._windowScrollY);
	}
	function wheelOver(){
		_userWheeling = false;
	}
	function scrollengine(){
		if(!_render) return;
		_twS += (_wS - _twS) * _speed * gsap.ticker.deltaRatio(60);
		move();
		_dSc = Math.abs(_twS-_wS), _distBottom = Math.abs(_end-_wS);
		if(_wS == 0 || _distBottom == 0){
			if(_dSc < .25) _twS = _wS, move(), stop(false); //at top or bottom of page - make sure to reach edge pixel
		}
		else if(_dSc < _threshold) stop(false);
	}
	function scrollResized(e){
		clearTimeout(_resizeTimer);
		_windowW = document.documentElement.scrollWidth - GLB._vw;
		_windowH = document.documentElement.scrollHeight - GLB._reliableSh;
		if(GLB._scrollAxis == 0) _end = _windowH;
		else _end = _windowW;
	}

	if(GLB._supportsPassive) window.addEventListener("wheel", wheeled, {passive:false});
	else GLBEvents(window, "wheel", wheeled, true);
	GLBEvents(window, "scroll", scrolled, true);
	GLBEvents(window, "LayoutUpdate", scrollResized, true);
	
	function stop(_cancelWheel){
		if(_cancelWheel) _userWheeling = false, _refreshWhenStarting = true;
		_render = false;
	}
	function move(){
		if(GLB._scrollAxis == 1) window.scrollTo(_twS,0);
		else window.scrollTo(0,_twS);
	}

	//Listen for changes in content size (as a backup to ensure correct scroll width)
	function resized(){
		clearTimeout(_resizeTimer);
		_resizeTimer = setTimeout(scrollResized, 60);//delay reading to avoid layout thrashes
	}
	if("ResizeObserver" in window) _resizeObserver = new ResizeObserver(resized);

	_this.removeOldPage = function(){
		if(_resizeObserver && _fsModules) _resizeObserver.unobserve(_fsModules);
		_fsModules = null;
	}

	_this.newPage = function(){
		_twS = _wS = GLB._windowScrollX = GLB._windowScrollY = _cachedScroll;
		if(GLB._scrollAxis == 1) window.scrollTo(_cachedScroll,0);
		else window.scrollTo(0,_cachedScroll);
		_cachedScroll = 0;//Reset for next page
		//Find container
		_fsModules = document.getElementsByClassName("page")[0] || null;
		if(_resizeObserver && _fsModules) _resizeObserver.observe(_fsModules);
		else scrollResized();
	}

	//Make sure keyboard instantly overwrites wheel/easing
	function kd(e){
		var _k = e.key;
		if(_k == "End" || _k == "Home" || _k == "PageDown" || _k == "PageUp" || _k == " " || (GLB._scrollAxis == 0 && (_k == "ArrowUp" || _k == "ArrowDown")) || (GLB._scrollAxis == 1 && (_k == "ArrowLeft" || _k == "ArrowRight"))) stop(true);
	}
	GLBEvents(window, "keydown", kd, true);
	//Pseudo-detect when clicking scrollbar and cancel wheel/easing
	function md(e){
		if(!_userWheeling) return;
		if(GLB._scrollAxis == 0){
			if((GLB._vwOuter != GLB._vw && e.clientX > GLB._vw) || (GLB._vwOuter == GLB._vw && e.clientX > GLB._vw-20)) stop(true);
		}
		else if(e.clientY > GLB._reliableSh-20) stop(true);
	}
	if(!GLB._hasTouch) GLBEvents(window, "mousedown", md, true);
	
	//Start (never stop because we need deltaRatio)
	gsap.ticker.add(scrollengine);
}

/*function Smoothscroll(){
	var _this = this;
	var _deltaY = 0, _whS = 0, _twS = 0, _windowW = GLB._vw, _windowH = GLB._reliableSh, _speed = .1;
	var _fsModules, _resizeObserver, sX = 0, sY = 0, pX = 0, pY = 0, _resizeTimer, PIXEL_STEP = 10, LINE_HEIGHT = 50;//relevant for Firefox primarily
	var _whT, _engineOn = false, _userWheeling = false, _refreshWhenStarting = false;
	var _threshold = 2.5;//normal screens (stop faster to avoid pixelsnapping near end of easing)
	if(GLB._dpi >= 2) _threshold = 1.5;//high density

	function wheeled(e){
		nWh(e);
		if(e.ctrlKey) return;
		e.stopPropagation(), e.preventDefault();
		
		if(GLB._scrollAxis == 1){
			if(Math.abs(_deltaY) > Math.abs(_deltaX)) _whS += _deltaY;
			else _whS += _deltaX;
			if(_whS < 0) _whS = 0;
			else if(_whS > _windowW) _whS = _windowW;
		}
		else{
			_whS += _deltaY;
			if(_whS < 0) _whS = 0;
			else if(_whS > _windowH) _whS = _windowH;
		}

		if(!_userWheeling){
			//Need to refresh (used scrollbar or keys)
			if(_refreshWhenStarting){
				_refreshWhenStarting = false;
				if(GLB._scrollAxis == 1) _whS = _twS = GLB._windowScrollX;
				else _whS = _twS = GLB._windowScrollY;
			}
		}
		if(!_engineOn) start();
		_userWheeling = true;
		clearTimeout(_whT);
		_whT = setTimeout(wheelOver, 1500);
	}
	function scrolled(e){
		if(!_userWheeling) _refreshWhenStarting = true;//must be scrollbar, keys etc. since wheel is not used
	}
	function wheelOver(){
		_userWheeling = false;
	}
	//Normalize wheel event		
	function nWh(e){
		if('deltaX' in e) pX = e.deltaX;
		if('deltaY' in e) pY = e.deltaY;
		else{
			// Legacy
			if ('detail'      in e) sY = e.detail;
			else if ('wheelDelta'  in e) sY = -e.wheelDelta / 120;
			else if ('wheelDeltaY' in e) sY = -e.wheelDeltaY / 120;
			else if ('wheelDeltaX' in e) sX = -e.wheelDeltaX / 120;
			// side scrolling on FF with DOMMouseScroll
			if('axis' in e && e.axis === e.HORIZONTAL_AXIS) sX = sY, sY = 0;
			pX = sX * PIXEL_STEP, pY = sY * PIXEL_STEP;
		}
				
		//Firefox (maybe others) that don't scroll in pixels
		if(!GLB._mac || GLB._firefox){
			if((pX || pY) && e.deltaMode){
				if(e.deltaMode == 1) pX *= LINE_HEIGHT, pY *= LINE_HEIGHT;
				else pX *= GLB._reliableSh, pY *= GLB._reliableSh;
			}
			else if(GLB._mac && GLB._firefox) pY *= 2;
		}
		// Fall-back if spin cannot be determined
		//if(pY && !sY){ sY = (pY < 1) ? -1 : 1;}
		_deltaX = pX, _deltaY = pY;
	}
	function scrollengine(){
		_twS += (_whS - _twS) * _speed * gsap.ticker.deltaRatio(60);
		if(GLB._scrollAxis == 1) window.scrollTo(_twS,0);
		else window.scrollTo(0,_twS);
		if((Math.abs(_twS-_whS) < _threshold)) stop(false);
	}
	function scrollResized(e){
		clearTimeout(_resizeTimer);
		_windowW = document.documentElement.scrollWidth - GLB._vw;
		_windowH = document.documentElement.scrollHeight - GLB._reliableSh;
	}

	if(GLB._supportsPassive) window.addEventListener("wheel", wheeled, {passive:false});
	else GLBEvents(window, "wheel", wheeled, true);
	GLBEvents(window, "scroll", scrolled, true);
	GLBEvents(window, "LayoutUpdate", scrollResized, true);
	
	function start(){
		_engineOn = true, gsap.ticker.add(scrollengine);
	}
	function stop(_cancelWheel){
		if(_cancelWheel) _userWheeling = false, _refreshWhenStarting = true;
		_engineOn = false, gsap.ticker.remove(scrollengine);
	}

	//Listen for changes in content size (as a backup to ensure correct scroll width)
	function resized(){
		clearTimeout(_resizeTimer);
		_resizeTimer = setTimeout(scrollResized, 60);//delay reading to avoid layout thrashes
	}
	if("ResizeObserver" in window) _resizeObserver = new ResizeObserver(resized);

	_this.removeOldPage = function(){
		if(_resizeObserver && _fsModules) _resizeObserver.unobserve(_fsModules);
		_fsModules = null;
	}

	_this.newPage = function(){
		_twS = _whS = GLB._windowScrollX = GLB._windowScrollY = _cachedScroll;
		if(GLB._scrollAxis == 1) window.scrollTo(_cachedScroll,0);
		else window.scrollTo(0,_cachedScroll);
		_cachedScroll = 0;//Reset for next page
		//Find container
		_fsModules = document.getElementsByClassName("fullscreensmodules")[0] || null;
		if(_resizeObserver && _fsModules) _resizeObserver.observe(_fsModules);
		else scrollResized();
	}

	//Make sure keyboard instantly overwrites wheel/easing
	function kd(e){
		var _k = e.key;
		if(_k == "End" || _k == "Home" || _k == "PageDown" || _k == "PageUp" || _k == " " || (GLB._scrollAxis == 0 && (_k == "ArrowUp" || _k == "ArrowDown")) || (GLB._scrollAxis == 1 && (_k == "ArrowLeft" || _k == "ArrowRight"))) stop(true);
	}
	GLBEvents(window, "keydown", kd, true);
	//Pseudo-detect when clicking scrollbar and cancel wheel/easing
	function md(e){
		if(!_userWheeling) return;
		if(GLB._scrollAxis == 0){
			if((GLB._vwOuter != GLB._vw && e.clientX > GLB._vw) || (GLB._vwOuter == GLB._vw && e.clientX > GLB._vw-20)) stop(true);
		}
		else if(e.clientY > GLB._reliableSh-20) stop(true);
	}
	if(!GLB._hasTouch) GLBEvents(window, "mousedown", md, true);
}*/
function TouchscrollHelper(){
	var _this = this;
	var _target;
	
	_this.removeOldPage = function(){}
	_this.newPage = function(){
		if(!GLB._isMobile && GLB._scrollAxis == 1){
			if(GLB._iosHoriScrolling) _target = document.body;
			else _target = window;
			_target.scrollTo(_cachedScroll,0);
			setTimeout(horiCached, 50);//have to do this again because resize events reset horizontal scroll position!
		}
		else{
			_target = window;
			_target.scrollTo(0,_cachedScroll);
			_cachedScroll = 0;//Reset for next page
		}
		GLB._windowScrollX = GLB._windowScrollY = 0;
		
		//console.log("GLB._scrollAxis", GLB._scrollAxis)
		if(!GLB._isMobile && GLB._scrollAxis == 1){
			//Touch events to handle vertical scrolling attempts
			GLBEvents(window, "touchstart", tdown, true);
			window.addEventListener("touchmove", tmove, {passive:false});
		}
		else{
			GLBEvents(window, "touchstart", tdown, false);
			window.removeEventListener("touchmove", tmove, {passive:false});
		}
	}
	function horiCached(){
		_target.scrollTo(_cachedScroll,0);
		_cachedScroll = 0;//Reset for next page
	}

	//Touch events (horizontal scrolling page)
	var _touched = false, _txInit = 0, _tyInit = 0, _deltaX = 0, _deltaY = 0;
	var _threshold = 4, _direction = -1, _moveSpeed = 0;
	function tdown(e){
		_touched = true;
		_txInit = e.touches[0].clientX, _tyInit = e.touches[0].clientY;
		GLBEvents(window, "touchend", tup, true);
		gsap.killTweensOf(_target);
	}
	function tmove(e){
		if(!_touched) return;
		if(_direction == 0) return;//x scrolling normally
		_deltaX = e.touches[0].clientX - _txInit, _deltaY = e.touches[0].clientY - _tyInit;
		if(_direction == 1){
			e.stopPropagation(), e.preventDefault();
			//Round up
			if(_deltaY < 0) _deltaY = Math.floor(_deltaY);
			else _deltaY = Math.ceil(_deltaY);
			_target.scrollTo(GLB._windowScrollX-_deltaY, 0);
			//Store speed for throwing effect
			_moveSpeed = ((_tyInit - e.touches[0].clientY) + _moveSpeed*2) / 3;
			//Reset
			_tyInit = e.touches[0].clientY;
			return;		
		}
		_deltaX = Math.abs(_deltaX), _deltaY = Math.abs(_deltaY);
		//console.log("tmove", _deltaX, _deltaY);
		if(_direction == -1){
			if(_deltaX > _deltaY && _deltaX > _threshold){
				//console.log("Lock x axis");
				_direction = 0;
			}
			else if(_deltaY > _deltaX && _deltaY > _threshold){
				//console.log("Lock y axis");
				_direction = 1;
			}
		}
	}
	function tup(e){
		_touched = false;
		if(_direction == 1){
			//console.log("Throw a little", _moveSpeed);
			if(_moveSpeed < -50) _moveSpeed = -50;
			else if(_moveSpeed > 50) _moveSpeed = 50;
			gsap.to(_target, 1, {scrollTo:{x:GLB._windowScrollX + _moveSpeed*50}, ease:"cubic"});
		}
		_direction = -1;
		GLBEvents(window, "touchend", tup, false);
	}
}

//Smooth (native) scroll
/*
function Smoothscroll(){
	var _this = this;
	var _deltaY = 0, _whSX = 0, _whSY = 0, _twSX = 0, _twSY = 0, _windowW = GLB._vw, _windowH = GLB._reliableSh, _speed = .1;
	var sX = 0, sY = 0, pX = 0, pY = 0;	
	var _whT, _userWheeling = false, _refreshWhenStarting = false;
	var PIXEL_STEP = 10, LINE_HEIGHT = 50;//relevant for Firefox primarily
	var _resizeTimer;

	function wheeled(e){
		nWh(e);
		e.preventDefault();
		e.stopPropagation();
		if(GLB._scrollAxis == 1){
			if(Math.abs(_deltaY) > Math.abs(_deltaX)) _whSX += _deltaY;
			else _whSX += _deltaX;
			if(_whSX < 0) _whSX = 0;
			else if(_whSX > _windowW) _whSX = _windowW;
		}
		else{
			_whSY += _deltaY;
			if(_whSY < 0) _whSY = 0;
			else if(_whSY > _windowH) _whSY = _windowH;
		}
		
		if(!_userWheeling){
			//Need to refresh (used scrollbar)
			if(_refreshWhenStarting){
				_refreshWhenStarting = false;
				if(GLB._scrollAxis == 1) _whSX = _twSX = document.documentElement.scrollLeft, _twSX += .5;//avoid instant stopping
				else _whSY = _twSY = GLB._windowScrollY, _twSY += .5;//avoid instant stopping				
			}
			gsap.ticker.add(scrollengine);
			window.dispatchEvent(new GLBEvent("updateScrollListeners"));
		}
		_userWheeling = true;
		clearTimeout(_whT);
		_whT = setTimeout(wheelOver, 1500);
	}
	function scrolled(e){
		//console.log("scrolled, _userWheeling:", _userWheeling);
		if(!_userWheeling) _refreshWhenStarting = true;
	}
	//Make sure keyboard shortcuts always work
	function keydown(e){
		var _k = e.key;
		if(_k == "End" || _k == "Home" || _k == "PageDown" || _k == "PageUp" || _k == " "){
			_userWheeling = false;
			gsap.ticker.remove(scrollengine);
		}
	}
	function wheelOver(){
		_userWheeling = false;
	}

	//Normalize wheel event		
	function nWh(e){
		if('deltaX' in e) pX = e.deltaX;
		if('deltaY' in e) pY = e.deltaY;
		else{
			// Legacy
			if ('detail'      in e) sY = e.detail;
			else if ('wheelDelta'  in e) sY = -e.wheelDelta / 120;
			else if ('wheelDeltaY' in e) sY = -e.wheelDeltaY / 120;
			else if ('wheelDeltaX' in e) sX = -e.wheelDeltaX / 120;
			// side scrolling on FF with DOMMouseScroll
			if('axis' in e && e.axis === e.HORIZONTAL_AXIS) sX = sY, sY = 0;
			pX = sX * PIXEL_STEP, pY = sY * PIXEL_STEP;
		}
				
		//Firefox (maybe others) that don't scroll in pixels
		if(!GLB._mac || GLB._firefox){
			if((pX || pY) && e.deltaMode){
				if(e.deltaMode == 1) pX *= LINE_HEIGHT, pY *= LINE_HEIGHT;
				else pX *= GLB._reliableSh, pY *= GLB._reliableSh;
			}
			else if(GLB._mac && GLB._firefox) pY *= 2;
		}
		// Fall-back if spin cannot be determined
		//if(pY && !sY){ sY = (pY < 1) ? -1 : 1;}
		_deltaX = pX, _deltaY = pY;
	}

	function scrollengine(){
		if(GLB._scrollAxis == 1){
			_twSX += (_whSX - _twSX) * _speed;
			window.scrollTo(_twSX,0);
		}
		else{
			_twSY += (_whSY - _twSY) * _speed;
			window.scrollTo(0,_twSY);
			if(_twSY > GLB._reliableSh*2 && (_twSY > _windowH - 150)){
				_nearFooter = true;
				window.dispatchEvent(new GLBEvent("showheader"));
			}
			else _nearFooter = false;
		}
		if(!_userWheeling && ((GLB._scrollAxis == 0 && Math.abs(_twSY-_whSY) < .2) || (GLB._scrollAxis == 1 && Math.abs(_twSX-_whSX) < .2))){
			//console.log("stop")
			gsap.ticker.remove(scrollengine);
		}
	}
	function scrollResized(e){
		clearTimeout(_resizeTimer);
		//if(!GLB._isMobile){
			_windowW = document.documentElement.scrollWidth - GLB._vw;
			_windowH = document.documentElement.scrollHeight - GLB._reliableSh;
		//}
	}

	//Even if this is a tablet, the "wheel" event isn't fired
	if(GLB._supportsPassive) window.addEventListener("wheel", wheeled, {passive:false});
	else GLBEvents(window, "wheel", wheeled, true);
	function redoWheelListeners(e){
		//console.log("redoWheelListeners")
		if(GLB._supportsPassive){
			window.removeEventListener("wheel", wheeled, {passive:false});
			window.addEventListener("wheel", wheeled, {passive:false});
		}
		else{
			GLBEvents(window, "wheel", wheeled, false);
			GLBEvents(window, "wheel", wheeled, true);
		}
	}
	GLBEvents(window, "redoWheelListeners", redoWheelListeners, true);
	GLBEvents(window, "scroll", scrolled, true);
	GLBEvents(window, "keydown", keydown, true);
	GLBEvents(window, "LayoutUpdate", scrollResized, true);
	GLBEvents(window, "scrollResized", scrollResized, true);
	setTimeout(scrollResized, 100);

	_this.newPage = function(){
		//console.log("newPage", GLB._hasTouch)
		_twSX = _whSX = _twSY = _whSY = GLB._windowScrollY = _cachedScroll;
		if(GLB._scrollAxis == 1){
			window.scrollTo(_cachedScroll,0);
			setTimeout(horiCached, 50);//have to do this again because resize events reset horizontal scroll position!
		}
		else{
			window.scrollTo(0,_cachedScroll);
			_cachedScroll = 0;//Reset for next page
		}
		GLB._windowScrollY = 0;
		scrollResized();
		clearTimeout(_resizeTimer);
		_resizeTimer = setTimeout(scrollResized, 150);//if certain elements need js to set their height etc.
	}
	function horiCached(){
		window.scrollTo(_cachedScroll,0);
		_cachedScroll = 0;//Reset for next page
	}
}
function TouchscrollHelper(){
	var _this = this;
	
	_this.newPage = function(){
		if(!GLB._isMobile && GLB._scrollAxis == 1){
			if(_iosV) document.body.scrollTo(_cachedScroll,0);
			else window.scrollTo(_cachedScroll,0);
			setTimeout(horiCached, 50);//have to do this again because resize events reset horizontal scroll position!
		}
		else{
			window.scrollTo(0,_cachedScroll);
			_cachedScroll = 0;//Reset for next page
		}
		GLB._windowScrollY = 0;
		
		//console.log("GLB._scrollAxis", GLB._scrollAxis)
		if(GLB._isMobile){
			//don't do anything on mobile
		}
		else if(GLB._scrollAxis == 1){
			//Touch events to handle vertical scrolling attempts
			GLBEvents(window, "touchstart", tdown, true);
			window.addEventListener("touchmove", tmove, {passive:false});
			if(GLB._iOS && GLB._hasTouch && GLB._vwOuter < 1181) _iosV = true;
			else _iosV = false;
		}
		else{
			GLBEvents(window, "touchstart", tdown, false);
			window.removeEventListener("touchmove", tmove, {passive:false});
		}
	}
	function horiCached(){
		if(_iosV) document.body.scrollTo(_cachedScroll,0);
		else window.scrollTo(_cachedScroll,0);
		_cachedScroll = 0;//Reset for next page
	}

	//Touch events (horizontal scrolling page)
	var _touched = false, _txInit = 0, _tyInit = 0, _deltaX = 0, _deltaY = 0;
	var _threshold = 4, _direction = -1, _moveSpeed = 0;
	function tdown(e){
		_touched = true;
		_txInit = e.touches[0].clientX, _tyInit = e.touches[0].clientY;
		GLBEvents(window, "touchend", tup, true);
		gsap.killTweensOf(window);
		if(GLB._iOS && GLB._hasTouch && GLB._vwOuter < 1181 && !GLB._isMobile) _iosV = true, gsap.killTweensOf(document.body);
		else _iosV = false;

	}
	function tmove(e){
		if(!_touched) return;
		if(_direction == 0) return;//x scrolling normally
		_deltaX = e.touches[0].clientX - _txInit, _deltaY = e.touches[0].clientY - _tyInit;
		if(_direction == 1){
			e.stopPropagation(), e.preventDefault();
			//try scrolling content
			if(_iosV) document.body.scrollTo(document.body.scrollLeft-_deltaY, 0);
			else window.scrollTo(document.documentElement.scrollLeft-_deltaY, 0);
			//Store speed for throwing effect
			_moveSpeed = ((_tyInit - e.touches[0].clientY) + _moveSpeed*2) / 3;
			//Reset
			_tyInit = e.touches[0].clientY;
			return;		
		}
		_deltaX = Math.abs(_deltaX), _deltaY = Math.abs(_deltaY);
		//console.log("tmove", _deltaX, _deltaY);
		if(_direction == -1){
			if(_deltaX > _deltaY && _deltaX > _threshold){
				//console.log("Lock x axis");
				_direction = 0;
			}
			else if(_deltaY > _deltaX && _deltaY > _threshold){
				//console.log("Lock y axis");
				_direction = 1;
			}
		}
	}
	function tup(e){
		_touched = false;
		if(_direction == 1){
			//console.log("Throw a little", _moveSpeed);
			if(_moveSpeed < -10) _moveSpeed = -10;
			else if(_moveSpeed > 10) _moveSpeed = 10;
			if(_iosV) gsap.to(document.body, .5, {scrollTo:{x:document.body.scrollLeft + _moveSpeed*40}, ease:"cubic"});
			else gsap.to(window, .5, {scrollTo:{x:document.documentElement.scrollLeft + _moveSpeed*40}, ease:"cubic"});
		}
		_direction = -1;
		GLBEvents(window, "touchend", tup, false);
	}
}
*/

/*		Globals		*/
var _cacheTime = new Date().getTime();
var _pages, _pageTransition;
var _menu, _pageDiv, _prefetches = [];
var _iosV = false, _cachedPageScroll = 0, _cachedScroll = 0;
//Init
var _router = new Router();
new Main();