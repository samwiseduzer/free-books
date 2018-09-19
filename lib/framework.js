var Router = (function() {
	let navBtns;
	let container;

	let Router = {
		current: null,
		routes: {},
		root: (
			window.location.protocol +
			'//' +
			window.location.host +
			window.location.pathname
		).slice(0, -1),
		default: '/',
		config: function(options) {
			this.default = options.default || options.root || this.root;
			this.root = options.root || this.root;
			Object.assign(options, this);
			defineSpinner(
				options.spinner ? options.spinner.color : undefined,
				options.spinner ? options.spinner.background : undefined
			);
			return this;
		},
		add: function(options) {
			// build regex pattern for validation
			options.re =
				options.path
					.replace(/{([a-zA-Z]|\d)*}/g, '(\\d|[a-zA-Z])*')
					.replace(/\\/, '\\') + '$';
			options.re = new RegExp(options.re);
			// build route param patterns
			let routeParts = options.path.split('/');
			let params = [];
			routeParts.forEach(function(routePart, i) {
				if (/{([a-zA-Z]|\d)*}/.test(routePart)) {
					let name = routePart.slice(1, -1);
					let routeParam = {
						name: name,
						getter: function(path) {
							return path.split('/')[i];
						}
					};
					params.push(routeParam);
				}
			});
			options.params = params;

			this.routes[options.path] = options;
			if (options.templateURL) {
				this.routes[options.path].promise = getFile(options.templateURL).then(
					data => {
						this.routes[options.path].template = data;
					}
				);
			}

			return this;
		},
		navigate: function(options) {
			// prevent routing if there's no change
			if (
				options.path &&
				this.current &&
				options.path === this.current.path &&
				!options.query &&
				!options.params &&
				!options.queryURL
			) {
				return;
			} else if (options.name && options.name === this.current.name) {
				let equal = true;
				if (
					options.hasOwnProperty('params') !==
						this.current.hasOwnProperty('params') ||
					options.hasOwnProperty('query') !==
						this.current.hasOwnProperty('query')
				) {
					equal = false;
				} else {
					for (let p in options.params) {
						if (options.params.hasOwnProperty(p)) {
							if (options.params[p] !== this.current.params[p]) {
								equal = false;
							}
						}
					}
					for (let p in this.current.params) {
						if (this.current.params.hasOwnProperty(p)) {
							if (options.params[p] !== this.current.params[p]) {
								equal = false;
							}
						}
					}
					for (let p in options.query) {
						if (options.query.hasOwnProperty(p)) {
							if (options.query[p] !== this.current.query[p]) {
								equal = false;
							}
						}
					}
					for (let p in this.current.query) {
						if (this.current.query.hasOwnProperty(p)) {
							if (options.query[p] !== this.current.query[p]) {
								equal = false;
							}
						}
					}
				}

				if (equal) return;
			}

			if (options.default) {
				window.location.href =
					window.location.href.replace(/#(.*)$/, '') + '#' + this.default;
				return this;
			} else if (options.name) {
				for (let route in this.routes) {
					if (this.routes[route].name === options.name) {
						this.current = {
							name: options.name,
							route: this.routes[route],
							path: this.routes[route].path
						};
						break;
					}
				}

				if (options.params) {
					let path = this.current.route.path;
					for (let param in options.params) {
						path = path.replace('{' + param + '}', options.params[param]);
					}
					this.current.path = path;
					this.current.params = options.params;
				}
				if (options.query) {
					let queryParams = new URLSearchParams();
					for (let param in options.query) {
						queryParams.append(param, options.query[param]);
					}
					this.current.path =
						this.current.path.slice(
							0,
							this.current.path.indexOf('?') !== -1
								? this.current.path.indexOf('?')
								: this.current.path.length
						) +
						'?' +
						queryParams.toString();
					this.current.query = options.query;
				}
			} else if (options.path) {
				for (let route in this.routes) {
					if (this.routes[route].re.test(options.path)) {
						this.current = {
							route: this.routes[route],
							path: options.path,
							name: this.routes[route].name
						};
						break;
					}
				}
				if (Object.keys(this.current.route.params).length) {
					let self = this;
					this.current.params = {};
					this.current.route.params.forEach(function(param) {
						self.current.params[param.name] = param.getter(self.current.path);
					});
				}
				if (options.queryURL) {
					this.current.query = options.queryURL.values;
					this.current.path += '?' + options.queryURL.string;
				}
			} else {
				throw new Error(
					'navigate options object requires name or path to be defined'
				);
			}

			// identify WHICH route is being used & then iterate over that route's route params to get values
			window.location.href =
				window.location.href.replace(/#(.*)$/, '') + '#' + this.current.path;

			if (this.current.route.resolver) {
				this.showLoader();
				let promises = [this.current.route.promise];
				let names = ['html'];
				for (let name in this.current.route.resolver) {
					promises.push(this.current.route.resolver[name](this.current));
					names.push(name);
				}
				Promise.all(promises).then(results => {
					this.current.resolver = {};
					for (let i = 1; i < names.length; i++) {
						this.current.resolver[names[i]] = results[i];
					}
					this.renderHTML();
					this.hideLoader();
					changePage(this.current.name);
					initRouteListeners();
					if (this.current.route.controller)
						this.current.route.controller(this.current);
				});
			} else {
				this.current.route.promise.then(() => {
					this.renderHTML();
					changePage(this.current.name);
					initRouteListeners();
					if (this.current.route.controller)
						this.current.route.controller(this.current);
				});
			}

			return this;
		},
		isValidPath: function(path) {
			for (let route in this.routes) {
				if (this.routes[route].re.test(path)) {
					return true;
				}
			}
			return false;
		},
		showLoader: function() {
			if (document.querySelector('loader')) {
				document.querySelector('loader').style.display = 'inline-block';
			} else {
				container.innerHTML = '<loader class="router-loader"></loader>';
			}
		},
		hideLoader: function() {
			document.querySelector('loader').style.display = 'none';
		},
		renderHTML: function() {
			let bound = {};
			if (this.current.route.prerender) {
				this.current.route.prerender.bind(bound)(this.current);
			}
			this.current.route.html = Handlebars.compile(this.current.route.template)(
				bound
			);
		}
	};

	window.addEventListener('hashchange', handleRouteChange);
	window.addEventListener('load', handleRouteChange);
	window.addEventListener('DOMContentLoaded', initRouteListeners);

	return Router;

	function handleRouteChange(event) {
		if (
			!Router.current ||
			window.location.hash.slice(1) !== Router.current.path
		) {
			let queryIdx = window.location.hash.indexOf('?');
			let hash = window.location.hash.slice(
				1,
				queryIdx !== -1 ? queryIdx : undefined
			);
			let query;

			let urlQuery = window.location.hash.match(/\?.*$/);
			if (urlQuery && urlQuery.length) {
				let search = new URLSearchParams(urlQuery[0].slice(1));
				let keys = search.keys();
				query = { values: {}, string: search.toString() };
				for (let key of keys) {
					query.values[key] = search.get(key);
				}
			}

			if (Router.isValidPath(hash.trim())) {
				Router.navigate({ path: hash, queryURL: query });
			} else {
				Router.navigate({ default: true });
			}
		}
	}

	function initRouteListeners() {
		navBtns = document.querySelectorAll('[nav-to]');
		container = document.querySelector('router');
		// setup listeners & navigation system
		forEach(navBtns, el => {
			el.addEventListener('click', function navTo(event) {
				let route = el.getAttribute('nav-to');
				let params = eval('(' + el.getAttribute('nav-params') + ')');
				let query = eval('(' + el.getAttribute('nav-query') + ')');

				Router.navigate({ name: route, params: params, query: query });
			});
		});
	}

	function forEach(nodeList, fn) {
		for (let i = 0; i < nodeList.length; i++) {
			fn(nodeList[i]);
		}
	}

	function changePage(page) {
		forEach(navBtns, el => {
			if (el.getAttribute('nav-to') === page) {
				el.classList.add('active');
			} else {
				el.classList.remove('active');
			}
		});
		container.innerHTML = Router.current.route.html;
	}

	function getFile(url) {
		return new Promise(function(resolve, reject) {
			fetch(Router.root + url)
				.then(res => {
					resolve(res.text());
				})
				.catch(function(err) {
					console.log('err getting template:', err);
					reject(err);
				});
		});
	}

	function defineSpinner(color, background) {
		background = background || '#f3f3f3';
		color = color || '#ccc';
		let style = document.createElement('style');
		style.innerHTML = `
			[nav-to]:hover {
				cursor: pointer;
			}

			.router-loader {
				border: 16px solid ${background}; /* Light Grey */
				border-top: 16px solid ${color}; /* Darker Grey */
				border-radius: 50%;
				width: 120px;
				height: 120px;
				animation: spin 2s linear infinite;
				display:flex;
				justify-self: center;
				align-self: center;
			}
	
			@keyframes spin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
			}`;
		document.head.appendChild(style);
	}
})();
