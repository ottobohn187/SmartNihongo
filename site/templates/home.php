<?php namespace ProcessWire;

// Template file for the homepage.

$isLoggedIn = $user->isLoggedin();
$progressDir = $config->paths->assets . 'smartnihongo-progress/';
$progressFile = $progressDir . 'hiragana-user-' . (int) $user->id . '.json';
$ensureProgressDir = function() use ($progressDir) {
	if(!is_dir($progressDir) && !mkdir($progressDir, 0755, true) && !is_dir($progressDir)) {
		return false;
	}

	$htaccess = $progressDir . '.htaccess';
	if(!is_file($htaccess)) {
		file_put_contents($htaccess, "Require all denied\nDeny from all\n");
	}

	$index = $progressDir . 'index.html';
	if(!is_file($index)) {
		file_put_contents($index, '');
	}

	return true;
};

if($input->get('sn_hiragana_progress')) {
	header('Content-Type: application/json; charset=utf-8');

	if(!$isLoggedIn) {
		http_response_code(401);
		echo json_encode(array('ok' => false, 'error' => 'login_required'));
		exit;
	}

	if($_SERVER['REQUEST_METHOD'] === 'POST') {
		$raw = file_get_contents('php://input');
		$payload = json_decode($raw, true);

		if(!is_array($payload)) {
			http_response_code(400);
			echo json_encode(array('ok' => false, 'error' => 'invalid_json'));
			exit;
		}

		if(!$ensureProgressDir()) {
			http_response_code(500);
			echo json_encode(array('ok' => false, 'error' => 'progress_dir_unavailable'));
			exit;
		}

		$summary = is_array($payload['summary'] ?? null) ? $payload['summary'] : array();
		$items = is_array($payload['items'] ?? null) ? $payload['items'] : array();

		$safe = array(
			'version' => 1,
			'updatedAt' => date('c'),
			'summary' => (object) $summary,
			'items' => (object) $items,
		);

		file_put_contents($progressFile, json_encode($safe, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
		echo json_encode(array('ok' => true, 'progress' => $safe), JSON_UNESCAPED_UNICODE);
		exit;
	}

	$progress = array('version' => 1, 'summary' => (object) array(), 'items' => (object) array());
	if(is_file($progressFile)) {
		$saved = json_decode(file_get_contents($progressFile), true);
		if(is_array($saved)) $progress = $saved;
	}

	echo json_encode(array('ok' => true, 'progress' => $progress), JSON_UNESCAPED_UNICODE);
	exit;
}

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
					Smart Nihongo starts with hiragana, pronunciation, and useful everyday phrases in a calm path for English speakers who want to start reading and speaking Japanese with confidence.
				</p>
				<div class="mt-7 flex flex-wrap gap-3">
					<a href="#hiragana" class="rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 font-extrabold text-white no-underline shadow-[0_12px_28px_rgba(79,70,229,0.35)] transition hover:-translate-y-0.5">Start with hiragana</a>
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

	<section id="hiragana" class="bg-[#020617] py-10">
		<div class="mx-auto max-w-7xl px-4">
			<?php if($isLoggedIn): ?>
			<div
				id="sn-hiragana-trainer"
				class="trainer-shell"
				data-progress-url="<?php echo $page->url; ?>?sn_hiragana_progress=1"
			>
				<div class="trainer-header">
					<div>
						<p class="feature-kicker">Logged-in practice</p>
						<h2>Hiragana flashcards</h2>
						<p>Mixed reading, listening, and romaji recall. Tap the card or Listen to hear the character pronounced.</p>
					</div>
					<div class="trainer-actions">
						<button id="sn-hiragana-reset" type="button" class="secondary-action">Reset</button>
					</div>
				</div>

				<div class="trainer-grid">
					<section class="trainer-panel trainer-card-panel" aria-live="polite">
						<p id="sn-trainer-mode" class="trainer-mode">Read this hiragana</p>
						<button id="sn-trainer-card" type="button" class="trainer-card" aria-label="Play pronunciation">
							<span id="sn-trainer-prompt" class="trainer-prompt">あ</span>
						</button>
						<div class="trainer-card-actions">
							<button id="sn-trainer-listen" type="button" class="primary-action">Listen</button>
							<button id="sn-trainer-next" type="button" class="secondary-action">Next</button>
						</div>
						<p id="sn-trainer-feedback" class="trainer-feedback">Pick the matching sound to begin.</p>
					</section>

					<section class="trainer-panel">
						<div id="sn-choice-grid" class="choice-grid"></div>
						<form id="sn-type-form" class="type-form hidden">
							<label for="sn-type-answer">Type the romaji sound</label>
							<div class="type-row">
								<input id="sn-type-answer" name="answer" autocomplete="off" inputmode="latin" placeholder="shi">
								<button type="submit" class="primary-action">Check</button>
							</div>
						</form>
					</section>

					<aside class="trainer-panel trainer-stats">
						<div class="stat-row">
							<span>Accuracy</span>
							<strong id="sn-stat-accuracy">0%</strong>
						</div>
						<div class="stat-row">
							<span>Answered</span>
							<strong id="sn-stat-answered">0</strong>
						</div>
						<div class="stat-row">
							<span>Streak</span>
							<strong id="sn-stat-streak">0</strong>
						</div>
						<div class="stat-row">
							<span>Started</span>
							<strong id="sn-stat-started">0/46</strong>
						</div>
						<div>
							<h3>Needs practice</h3>
							<div id="sn-weak-list" class="weak-list">Answer a few cards and weak spots will appear here.</div>
						</div>
					</aside>
				</div>
			</div>
			<?php else: ?>
			<div class="login-practice-card">
				<div>
					<p class="feature-kicker">Hiragana first</p>
					<h2>Log in to start tracked flashcards.</h2>
					<p>Your hiragana scores, streak, and weak characters will save after you sign in.</p>
				</div>
				<a href="<?php echo $config->urls->root; ?>admin123/" class="rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 font-extrabold text-white no-underline shadow-[0_12px_28px_rgba(79,70,229,0.35)] transition hover:-translate-y-0.5">Log in</a>
			</div>
			<?php endif; ?>
		</div>
	</section>

	<section class="bg-[#020617] py-10">
		<div class="mx-auto grid max-w-7xl gap-4 px-4 lg:grid-cols-3">
			<article class="feature-card">
				<p class="feature-kicker">Step 1</p>
				<h2>Hiragana first</h2>
				<p>Learn the basic hiragana sounds as a reading system, not random symbols. The goal is to read simple Japanese out loud early.</p>
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
