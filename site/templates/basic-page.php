<?php namespace ProcessWire;

$body = $page->get('body');

?>

<main id="content" class="mx-auto max-w-4xl px-4 py-12">
	<article class="rounded-3xl border border-white/10 bg-[#071226] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.28)] sm:p-8">
		<h1 class="text-3xl font-extrabold text-white sm:text-4xl"><?php echo $sanitizer->entities($page->title); ?></h1>
		<div class="prose-dark mt-5 text-lg leading-8 text-slate-200">
			<?php if($body): ?>
				<?php echo $body; ?>
			<?php else: ?>
				<p>This Smart Nihongo page is ready for Japanese learning content inside ProcessWire.</p>
			<?php endif; ?>
		</div>
	</article>
</main>
