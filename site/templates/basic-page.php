<?php namespace ProcessWire;

$body = $page->get('body');
$isFlashcardsPage = $page->name === 'flashcards';
$isRestaurantPage = $page->name === 'restaurant-talk';

if($isFlashcardsPage) {
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
}

?>

<?php if($isFlashcardsPage): ?>
<main id="content" class="learning-page">
	<section class="page-hero">
		<p class="feature-kicker">Separate area</p>
		<h1>Hiragana Flashcards</h1>
		<p>Mixed reading, listening, and typed romaji practice. Click the flashcard or Listen to hear the hiragana pronounced.</p>
	</section>

	<section class="learning-section">
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
					<p>Your progress saves to this account and the mix favors characters that need more reps.</p>
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
				<p class="feature-kicker">Login required</p>
				<h2>Log in to start tracked flashcards.</h2>
				<p>Your hiragana scores, streak, and weak characters save after you sign in.</p>
			</div>
			<a href="<?php echo $config->urls->root; ?>admin123/" class="rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 font-extrabold text-white no-underline shadow-[0_12px_28px_rgba(79,70,229,0.35)] transition hover:-translate-y-0.5">Log in</a>
		</div>
		<?php endif; ?>
	</section>
</main>

<?php elseif($isRestaurantPage): ?>
<main id="content" class="learning-page">
	<section class="page-hero">
		<p class="feature-kicker">Sample 2D lesson</p>
		<h1>Japanese Restaurant Talk</h1>
		<p>A first conversation page for ordering politely. Each line can be played aloud, and the layout is ready for more scenes later.</p>
	</section>

	<section class="restaurant-layout">
		<div class="restaurant-scene" aria-label="2D restaurant counter scene">
			<div class="restaurant-wall">
				<div class="menu-board">
					<span>メニュー</span>
					<small>ラーメン / お茶 / 水</small>
				</div>
			</div>
			<div class="restaurant-counter"></div>
			<div class="restaurant-person server">
				<span class="person-head"></span>
				<span class="person-body"></span>
				<strong>店員</strong>
			</div>
			<div class="restaurant-person guest">
				<span class="person-head"></span>
				<span class="person-body"></span>
				<strong>お客さん</strong>
			</div>
			<div class="speech-bubble server-bubble">いらっしゃいませ。</div>
			<div class="speech-bubble guest-bubble">ラーメンをください。</div>
		</div>

		<div class="dialogue-panel">
			<div class="dialogue-line">
				<button type="button" class="line-play" data-speak-text="いらっしゃいませ。">Listen</button>
				<div>
					<p class="speaker">Server</p>
					<p class="japanese-line">いらっしゃいませ。</p>
					<p class="romaji-line">Irasshaimase.</p>
					<p class="english-line">Welcome.</p>
				</div>
			</div>
			<div class="dialogue-line">
				<button type="button" class="line-play" data-speak-text="こんにちは。ラーメンをください。">Listen</button>
				<div>
					<p class="speaker">Guest</p>
					<p class="japanese-line">こんにちは。ラーメンをください。</p>
					<p class="romaji-line">Konnichiwa. Ramen o kudasai.</p>
					<p class="english-line">Hello. Ramen, please.</p>
				</div>
			</div>
			<div class="dialogue-line">
				<button type="button" class="line-play" data-speak-text="お飲み物は何にしますか。">Listen</button>
				<div>
					<p class="speaker">Server</p>
					<p class="japanese-line">お飲み物は何にしますか。</p>
					<p class="romaji-line">Onomimono wa nani ni shimasu ka.</p>
					<p class="english-line">What would you like to drink?</p>
				</div>
			</div>
			<div class="dialogue-line">
				<button type="button" class="line-play" data-speak-text="お水をお願いします。">Listen</button>
				<div>
					<p class="speaker">Guest</p>
					<p class="japanese-line">お水をお願いします。</p>
					<p class="romaji-line">Omizu o onegai shimasu.</p>
					<p class="english-line">Water, please.</p>
				</div>
			</div>
		</div>
	</section>

	<section class="learning-card-grid">
		<article class="feature-card">
			<p class="feature-kicker">Pattern</p>
			<h2>__をください</h2>
			<p>Use this to ask for an item directly: ラーメンをください means “Ramen, please.”</p>
		</article>
		<article class="feature-card">
			<p class="feature-kicker">Polite request</p>
			<h2>お願いします</h2>
			<p>Use this when asking someone to do something for you. It is softer than a direct order.</p>
		</article>
	</section>
</main>

<?php else: ?>
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
<?php endif; ?>
