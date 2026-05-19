<?php namespace ProcessWire;

/** @var Page $page */
/** @var Pages $pages */
/** @var Config $config */

$home = $pages->get('/');
$requestPath = trim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
$active = $requestPath === '' ? 'home' : $requestPath;
$siteTitle = 'Smart Nihongo';

?><!doctype html>
<html lang="en">
<head id="html-head">
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="description" content="Smart Nihongo helps English speakers build a practical foundation in Japanese, starting with hiragana, pronunciation, and useful everyday phrases.">
	<title><?php echo $sanitizer->entities($page->title); ?> | smartnihongo.com</title>
	<script src="https://cdn.tailwindcss.com"></script>
	<link rel="stylesheet" href="<?php echo $config->urls->templates; ?>styles/main.css?v=20260519-hiragana1">
	<script defer src="<?php echo $config->urls->templates; ?>scripts/main.js?v=20260519-hiragana1"></script>
</head>

<body id="html-body" class="min-h-screen bg-slate-950 text-white antialiased">
	<div class="min-h-screen bg-[#020617]">
		<header class="sticky top-0 z-50 border-b border-blue-300/20 bg-[linear-gradient(90deg,#061a3d_0%,#082a5e_48%,#14245f_100%)] shadow-[0_18px_44px_rgba(37,99,235,0.18)] backdrop-blur-xl">
			<div class="mx-auto max-w-7xl px-4">
				<div class="flex items-center justify-between gap-4 py-4">
					<a href="<?php echo $home->url; ?>" class="flex items-center gap-3 no-underline" aria-label="Smart Nihongo home">
						<span class="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-blue-500 to-purple-500 text-xs font-extrabold text-white shadow-[0_12px_28px_rgba(79,70,229,0.35)]">SN</span>
						<span class="text-base font-extrabold tracking-tight text-white sm:text-lg"><?php echo $siteTitle; ?></span>
					</a>

					<nav class="hidden items-center gap-2 text-sm font-semibold md:flex" aria-label="Main navigation">
						<a href="<?php echo $home->url; ?>" class="rounded-2xl border border-blue-100/15 px-4 py-3 no-underline transition hover:bg-white/10<?php echo $active === 'home' ? ' bg-white/10 text-white shadow-inner' : ' text-slate-200'; ?>">Home</a>
						<a href="<?php echo $config->urls->root; ?>#hiragana" class="rounded-2xl px-4 py-3 no-underline text-slate-200 transition hover:bg-white/10 hover:text-white">Hiragana</a>
						<a href="<?php echo $config->urls->root; ?>#phrases" class="rounded-2xl px-4 py-3 no-underline text-slate-200 transition hover:bg-white/10 hover:text-white">Phrases</a>
						<a href="<?php echo $config->urls->root; ?>#practice" class="rounded-2xl px-4 py-3 no-underline text-slate-200 transition hover:bg-white/10 hover:text-white">Practice</a>
						<a href="<?php echo $config->urls->root; ?>admin123/" class="whitespace-nowrap rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 px-5 py-3 text-white no-underline shadow-[0_12px_28px_rgba(79,70,229,0.35)] transition hover:-translate-y-0.5">Admin</a>
					</nav>

					<button id="sn-menu-button" type="button" class="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white md:hidden" aria-expanded="false" aria-controls="sn-mobile-menu">Menu</button>
				</div>

				<nav id="sn-mobile-menu" class="hidden pb-4 md:hidden" aria-label="Mobile navigation">
					<div class="grid gap-2 rounded-2xl border border-white/10 bg-[#0b1220] p-3 text-sm font-semibold shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
						<a href="<?php echo $home->url; ?>" class="rounded-xl px-3 py-2 text-slate-200 no-underline hover:bg-white/10 hover:text-white">Home</a>
						<a href="<?php echo $config->urls->root; ?>#hiragana" class="rounded-xl px-3 py-2 text-slate-200 no-underline hover:bg-white/10 hover:text-white">Hiragana</a>
						<a href="<?php echo $config->urls->root; ?>#phrases" class="rounded-xl px-3 py-2 text-slate-200 no-underline hover:bg-white/10 hover:text-white">Phrases</a>
						<a href="<?php echo $config->urls->root; ?>#practice" class="rounded-xl px-3 py-2 text-slate-200 no-underline hover:bg-white/10 hover:text-white">Practice</a>
						<a href="<?php echo $config->urls->root; ?>admin123/" class="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-2 text-white no-underline">Admin</a>
					</div>
				</nav>
			</div>
		</header>

		<main id="content">
			Default content
		</main>

		<footer class="mx-auto flex max-w-7xl flex-col gap-3 border-t border-white/10 px-4 py-8 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
			<p>&copy; <?php echo date('Y'); ?> smartnihongo.com</p>
			<div class="flex flex-wrap gap-4">
				<a href="<?php echo $config->urls->root; ?>admin123/" class="text-blue-300 no-underline hover:text-white hover:underline">Admin</a>
				<?php if($page->editable()): ?>
				<a href="<?php echo $page->editUrl(); ?>" class="text-blue-300 no-underline hover:text-white hover:underline">Edit this page</a>
				<?php endif; ?>
			</div>
		</footer>
	</div>
</body>
</html>
