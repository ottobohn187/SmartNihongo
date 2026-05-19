(function () {
	const menuButton = document.getElementById('sn-menu-button');
	const mobileMenu = document.getElementById('sn-mobile-menu');

	if (!menuButton || !mobileMenu) return;

	menuButton.addEventListener('click', function () {
		const isOpen = !mobileMenu.classList.contains('hidden');
		mobileMenu.classList.toggle('hidden', isOpen);
		menuButton.setAttribute('aria-expanded', String(!isOpen));
	});
})();
