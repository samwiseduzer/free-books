var Book = (function() {
	return {
		prerender: prerender,
		controller: controller,
		resolver: resolvers()
	};

	function prerender(route) {
		this.title = route.resolver.book.volumeInfo.title;
		this.epubLink = route.resolver.book.accessInfo.epub.downloadLink;
		this.pdfLink = route.resolver.book.accessInfo.pdf.downloadLink;
	}
	function controller(route) {
		let viewer = new google.books.DefaultViewer(
			document.getElementById('viewerCanvas')
		);
		viewer.load(route.params.id);
	}
	function resolvers(route) {
		return {
			book: function(route) {
				return new Promise((resolve, reject) => {
					getBook(route.params.id).then(book => resolve(book));
				});
			}
		};
	}

	function getBook(id) {
		return new Promise((resolve, reject) => {
			$.getJSON('https://www.googleapis.com/books/v1/volumes/' + id, function(
				response
			) {
				resolve(response);
			}).fail(function(jqXHR, textStatus, errorThrown) {
				reject('textStatus:', textStatus);
			});
		});
	}
})();
