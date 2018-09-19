var Search = (function() {
	let booksApiUrl = 'https://www.googleapis.com/books/v1/volumes';

	return {
		prerender: prerender,
		controller: controller,
		resolver: resolver()
	};

	function prerender(route) {
		this.books = !route.resolver.results
			? []
			: route.resolver.results.items.map(book => ({
					title: book.volumeInfo.title,
					publisher: book.volumeInfo.publisher,
					authors: book.volumeInfo.authors
						? book.volumeInfo.authors.join(', ')
						: 'Unknown',
					image: book.volumeInfo.imageLinks.smallThumbnail,
					pages: book.volumeInfo.pageCount,
					published: book.volumeInfo.publishedDate,
					id: book.id
			  }));
		this.canNext = route.query
			? +route.query.startIndex + 10 <= +route.resolver.results.totalItems ||
			  (!route.query.startIndex && +route.resolver.results.totalItems > 10)
			: false;
		this.canPrev =
			route.query && route.query.startIndex
				? +route.query.startIndex >= 10
				: false;
	}

	function controller(route) {
		console.log('route:', route);
		let titleInput = $('#title-input');
		let authorInput = $('#author-input');
		let categoryInput = $('#category-input');

		// initialize inputs
		if (route.query) {
			titleInput.val(
				route.query.q.includes('intitle:')
					? route.query.q
							.replace(/\+/g, ' ')
							.match(/intitle:"([a-zA-Z]|\d|\s)*"/)[0]
							.slice(9, -1)
					: ''
			);
			authorInput.val(
				route.query.q.includes('inauthor:')
					? route.query.q
							.replace(/\+/g, ' ')
							.match(/inauthor:"([a-zA-Z]|\d|\s)*"/)[0]
							.slice(10, -1)
					: ''
			);
			categoryInput.val(
				route.query.q.includes('insubject:')
					? route.query.q
							.replace(/\+/g, ' ')
							.match(/insubject:"([a-zA-Z]|\d|\s)*"/)[0]
							.slice(11, -1)
					: ''
			);
		}

		$('#search-btn').click(function() {
			let query = { q: [], langRestrict: 'en', filter: 'free-ebooks' };
			let title = titleInput.val();
			let author = authorInput.val();
			let category = categoryInput.val();
			if (title) query.q.push('intitle:"' + title.replace(/ /g, '+') + '"');
			if (author) query.q.push('inauthor:"' + author.replace(/ /g, '+') + '"');
			if (category)
				query.q.push('insubject:"' + category.replace(/ /g, '+') + '"');
			query.q = query.q.join('+');
			console.log('search query:', query);
			Router.navigate({ name: 'Search', query: query });
		});

		$('#next-page').click(function() {
			Object.assign(route.query, {
				startIndex: route.query.startIndex ? +route.query.startIndex + 10 : 10
			});
			Router.navigate({ name: 'Search', query: route.query });
		});

		$('#prev-page').click(function() {
			Object.assign(route.query, {
				startIndex:
					route.query.startIndex <= 10 ? 0 : +route.query.startIndex - 10
			});
			if (!route.query.startIndex) delete route.query.startIndex;
			Router.navigate({ name: 'Search', query: route.query });
		});

		$('#search-inputs').keyup(function(event) {
			console.log('clicked');
			if (event.which === 13) $('#search-btn').click();
		});
	}

	function resolver() {
		return {
			results: function(route) {
				return new Promise((resolve, reject) => {
					if (route.query) {
						search(route.query)
							.then(data =>
								resolve({
									items: data.items || [],
									totalItems: data.totalItems
								})
							)
							.catch(err => reject(err));
					} else {
						resolve({
							items: [],
							totalItems: 0
						});
					}
				});
			}
		};
	}

	function search(criteria) {
		return new Promise((resolve, reject) => {
			let queryParams = new URLSearchParams();
			for (let key in criteria) {
				queryParams.append(key, criteria[key]);
			}
			$.getJSON(booksApiUrl + '?' + queryParams.toString(), function(response) {
				resolve(response);
			}).fail(function(jqXHR, textStatus, errorThrown) {
				reject('textStatus:', textStatus);
			});
		});
	}
})();
