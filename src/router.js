Router.config({ default: '/search', spinner: { color: '#4285f4' } })
	.add({
		name: 'search',
		path: '/search',
		templateURL: '/templates/search.html',
		controller: Search.controller,
		prerender: Search.prerender,
		resolver: Search.resolver
	})
	.add({
		name: 'book',
		path: '/book/{id}',
		templateURL: '/templates/book.html',
		controller: Book.controller,
		prerender: Book.prerender,
		resolver: Book.resolver
	});
