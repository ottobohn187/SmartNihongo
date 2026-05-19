<?php namespace ProcessWire;

// Template file for the homepage.

?>

<main id="content">
	<section class="relative overflow-hidden border-b border-white/10 bg-[#06162f]">
		<div class="pointer-events-none absolute inset-0">
			<img
				src="https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&amp;fit=crop&amp;w=2000&amp;q=85"
				alt=""
				class="h-full w-full object-cover opacity-25"
			>
			<div class="absolute inset-0 bg-[linear-gradient(110deg,rgba(2,6,23,0.96)_0%,rgba(8,31,68,0.9)_48%,rgba(88,42,142,0.78)_100%)]"></div>
		</div>

		<div class="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:py-14">
			<div class="max-w-4xl">
				<div class="mb-4 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase text-blue-100 backdrop-blur sm:text-sm">
					Japanese language learning made practical
				</div>
				<h1 class="max-w-4xl text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
					Build your first real Japanese foundation.
				</h1>
				<p class="mt-5 max-w-3xl text-xl leading-relaxed text-slate-100 sm:text-2xl">
					Smart Nihongo introduces hiragana, katakana, pronunciation, and useful everyday phrases in a calm path for English speakers who want to start reading and speaking Japanese with confidence.
				</p>
				<div class="mt-7 flex flex-wrap gap-3">
					<a href="#kana" class="rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 font-extrabold text-white no-underline shadow-[0_12px_28px_rgba(79,70,229,0.35)] transition hover:-translate-y-0.5">Start with kana</a>
					<a href="#practice" class="rounded-2xl border border-white/15 bg-white/10 px-6 py-3 font-extrabold text-white no-underline backdrop-blur transition hover:bg-white/15">Practice plan</a>
				</div>
			</div>

			<div class="rounded-3xl border border-white/10 bg-[#071226]/90 p-5 shadow-[0_24px_64px_rgba(0,0,0,0.35)] backdrop-blur">
				<div class="grid grid-cols-3 gap-3 text-center">
					<div class="kana-card">
						<span class="kana-glyph">あ</span>
						<span class="kana-sound">a</span>
					</div>
					<div class="kana-card">
						<span class="kana-glyph">い</span>
						<span class="kana-sound">i</span>
					</div>
					<div class="kana-card">
						<span class="kana-glyph">う</span>
						<span class="kana-sound">u</span>
					</div>
					<div class="kana-card">
						<span class="kana-glyph">え</span>
						<span class="kana-sound">e</span>
					</div>
					<div class="kana-card">
						<span class="kana-glyph">お</span>
						<span class="kana-sound">o</span>
					</div>
					<div class="kana-card kana-card-accent">
						<span class="kana-glyph">日</span>
						<span class="kana-sound">sun/day</span>
					</div>
				</div>
				<p class="mt-5 rounded-2xl border border-blue-300/15 bg-blue-500/10 p-4 text-sm leading-6 text-blue-50">
					Begin with sounds you can recognize, then connect them to useful phrases and short reading practice.
				</p>
			</div>
		</div>
	</section>

	<section class="bg-[#020617] py-10">
		<div class="mx-auto grid max-w-7xl gap-4 px-4 lg:grid-cols-3">
			<article id="kana" class="feature-card">
				<p class="feature-kicker">Step 1</p>
				<h2>Kana first</h2>
				<p>Learn hiragana and katakana as sound systems, not random symbols. The goal is to read simple Japanese out loud early.</p>
			</article>
			<article id="phrases" class="feature-card">
				<p class="feature-kicker">Step 2</p>
				<h2>Useful phrases</h2>
				<p>Practice greetings, introductions, ordering, directions, and polite everyday patterns you can actually use.</p>
			</article>
			<article id="practice" class="feature-card">
				<p class="feature-kicker">Step 3</p>
				<h2>Small daily reps</h2>
				<p>Keep sessions focused: review five kana, speak one phrase, read one short line, then repeat tomorrow.</p>
			</article>
		</div>
	</section>
</main>
