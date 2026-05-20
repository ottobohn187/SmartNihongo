(function () {
	const menuButton = document.getElementById('sn-menu-button');
	const mobileMenu = document.getElementById('sn-mobile-menu');

	if (menuButton && mobileMenu) {
		menuButton.addEventListener('click', function () {
			const isOpen = !mobileMenu.classList.contains('hidden');
			mobileMenu.classList.toggle('hidden', isOpen);
			menuButton.setAttribute('aria-expanded', String(!isOpen));
		});
	}

	const trainer = document.getElementById('sn-hiragana-trainer');
	if (trainer) {

	const HIRAGANA = [
		['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o'],
		['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko'],
		['さ', 'sa'], ['し', 'shi'], ['す', 'su'], ['せ', 'se'], ['そ', 'so'],
		['た', 'ta'], ['ち', 'chi'], ['つ', 'tsu'], ['て', 'te'], ['と', 'to'],
		['な', 'na'], ['に', 'ni'], ['ぬ', 'nu'], ['ね', 'ne'], ['の', 'no'],
		['は', 'ha'], ['ひ', 'hi'], ['ふ', 'fu'], ['へ', 'he'], ['ほ', 'ho'],
		['ま', 'ma'], ['み', 'mi'], ['む', 'mu'], ['め', 'me'], ['も', 'mo'],
		['や', 'ya'], ['ゆ', 'yu'], ['よ', 'yo'],
		['ら', 'ra'], ['り', 'ri'], ['る', 'ru'], ['れ', 're'], ['ろ', 'ro'],
		['わ', 'wa'], ['を', 'wo'], ['ん', 'n']
	].map(function (item) {
		return { char: item[0], romaji: item[1] };
	});

	const progressUrl = trainer.dataset.progressUrl;
	const storageKey = 'smartnihongo.hiragana.progress.v1';
	const promptEl = document.getElementById('sn-trainer-prompt');
	const modeEl = document.getElementById('sn-trainer-mode');
	const cardButton = document.getElementById('sn-trainer-card');
	const listenButton = document.getElementById('sn-trainer-listen');
	const nextButton = document.getElementById('sn-trainer-next');
	const feedbackEl = document.getElementById('sn-trainer-feedback');
	const choiceGrid = document.getElementById('sn-choice-grid');
	const typeForm = document.getElementById('sn-type-form');
	const typeAnswer = document.getElementById('sn-type-answer');
	const resetButton = document.getElementById('sn-hiragana-reset');
	const stats = {
		accuracy: document.getElementById('sn-stat-accuracy'),
		answered: document.getElementById('sn-stat-answered'),
		streak: document.getElementById('sn-stat-streak'),
		started: document.getElementById('sn-stat-started'),
		weakList: document.getElementById('sn-weak-list')
	};

	let progress = loadLocalProgress();
	let current = null;
	let currentMode = 'read';
	let answered = false;

	function loadLocalProgress() {
		try {
			const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
			return normalizeProgress(saved);
		} catch (error) {
			return normalizeProgress({});
		}
	}

	function normalizeProgress(source) {
		const summary = source.summary && !Array.isArray(source.summary) ? source.summary : {};
		const items = source.items && !Array.isArray(source.items) ? source.items : {};

		return {
			version: 1,
			updatedAt: source.updatedAt || null,
			summary: Object.assign({ answered: 0, correct: 0, streak: 0, bestStreak: 0 }, summary),
			items: items
		};
	}

	function itemStats(item) {
		const saved = progress.items[item.romaji] || {};
		return Object.assign({ seen: 0, correct: 0, wrong: 0, streak: 0, lastSeen: 0 }, saved);
	}

	function weightedPick() {
		const weighted = HIRAGANA.map(function (item) {
			const stat = itemStats(item);
			const accuracy = stat.seen ? stat.correct / stat.seen : 0;
			const weakBonus = stat.seen ? Math.max(0, 1 - accuracy) * 9 : 10;
			const wrongBonus = Math.min(stat.wrong, 5) * 1.7;
			return { item: item, weight: 2 + weakBonus + wrongBonus };
		});
		const total = weighted.reduce(function (sum, row) { return sum + row.weight; }, 0);
		let cursor = Math.random() * total;
		for (const row of weighted) {
			cursor -= row.weight;
			if (cursor <= 0) return row.item;
		}
		return HIRAGANA[0];
	}

	function shuffle(list) {
		return list.slice().sort(function () { return Math.random() - 0.5; });
	}

	function makeChoices(correctItem, field) {
		const pool = shuffle(HIRAGANA.filter(function (item) { return item.romaji !== correctItem.romaji; })).slice(0, 3);
		return shuffle(pool.concat(correctItem)).map(function (item) {
			return { label: item[field], value: item.romaji, item: item };
		});
	}

	function chooseMode() {
		const modes = ['read', 'listen', 'type'];
		if (progress.summary.answered < 4) return 'read';
		return modes[Math.floor(Math.random() * modes.length)];
	}

	function renderCard() {
		current = weightedPick();
		currentMode = chooseMode();
		answered = false;
		nextButton.disabled = false;
		feedbackEl.textContent = 'Take your best shot.';
		choiceGrid.innerHTML = '';
		typeForm.classList.add('hidden');
		typeAnswer.value = '';
		cardButton.classList.remove('is-correct', 'is-wrong');

		if (currentMode === 'listen') {
			modeEl.textContent = 'Listen and choose the hiragana';
			promptEl.textContent = 'Listen';
			renderChoices(makeChoices(current, 'char'));
		} else if (currentMode === 'type') {
			modeEl.textContent = 'Type the romaji sound';
			promptEl.textContent = current.char;
			typeForm.classList.remove('hidden');
			setTimeout(function () { typeAnswer.focus(); }, 0);
		} else {
			modeEl.textContent = 'Read this hiragana';
			promptEl.textContent = current.char;
			renderChoices(makeChoices(current, 'romaji'));
		}
	}

	function renderChoices(choices) {
		choices.forEach(function (choice) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'choice-button';
			button.textContent = choice.label;
			button.addEventListener('click', function () {
				checkAnswer(choice.value, button);
			});
			choiceGrid.appendChild(button);
		});
	}

	function checkAnswer(answer, button) {
		if (answered || !current) return;
		const normalized = String(answer).trim().toLowerCase();
		const isCorrect = normalized === current.romaji;
		answered = true;
		recordResult(isCorrect);

		Array.from(choiceGrid.children).forEach(function (choiceButton) {
			if (choiceButton.textContent === current.romaji || choiceButton.textContent === current.char) {
				choiceButton.classList.add('is-correct');
			}
			choiceButton.disabled = true;
		});

		if (button && !isCorrect) button.classList.add('is-wrong');
		cardButton.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
		feedbackEl.textContent = isCorrect ? 'Correct. Nice rep.' : 'Almost. This one is ' + current.char + ' = ' + current.romaji + '.';
		speak(current);
	}

	function recordResult(isCorrect) {
		const item = itemStats(current);
		item.seen += 1;
		item.lastSeen = Date.now();

		if (isCorrect) {
			item.correct += 1;
			item.streak += 1;
			progress.summary.correct += 1;
			progress.summary.streak += 1;
			progress.summary.bestStreak = Math.max(progress.summary.bestStreak, progress.summary.streak);
		} else {
			item.wrong += 1;
			item.streak = 0;
			progress.summary.streak = 0;
		}

		progress.summary.answered += 1;
		progress.items[current.romaji] = item;
		progress.updatedAt = new Date().toISOString();
		updateStats();
		saveProgress();
	}

	function updateStats() {
		const summary = progress.summary;
		const accuracy = summary.answered ? Math.round((summary.correct / summary.answered) * 100) : 0;
		const started = HIRAGANA.filter(function (item) { return itemStats(item).seen > 0; }).length;
		stats.accuracy.textContent = accuracy + '%';
		stats.answered.textContent = summary.answered;
		stats.streak.textContent = summary.streak;
		stats.started.textContent = started + '/46';

		const weak = HIRAGANA
			.map(function (item) {
				const stat = itemStats(item);
				const accuracyValue = stat.seen ? stat.correct / stat.seen : 1;
				return { item: item, stat: stat, accuracy: accuracyValue };
			})
			.filter(function (row) { return row.stat.seen > 0 && row.accuracy < 0.85; })
			.sort(function (a, b) { return a.accuracy - b.accuracy || b.stat.seen - a.stat.seen; })
			.slice(0, 6);

		if (!weak.length) {
			stats.weakList.textContent = summary.answered ? 'No weak spots yet. Keep mixing reps.' : 'Answer a few cards and weak spots will appear here.';
			return;
		}

		stats.weakList.innerHTML = '';
		weak.forEach(function (row) {
			const chip = document.createElement('span');
			chip.className = 'weak-chip';
			chip.textContent = row.item.char + ' ' + row.item.romaji;
			stats.weakList.appendChild(chip);
		});
	}

	function speak(item) {
		if (!('speechSynthesis' in window)) {
			feedbackEl.textContent = 'Audio is not available in this browser.';
			return;
		}
		const utterance = new SpeechSynthesisUtterance(item.char);
		utterance.lang = 'ja-JP';
		utterance.rate = 0.78;
		utterance.pitch = 1;
		window.speechSynthesis.cancel();
		window.speechSynthesis.speak(utterance);
	}

	function saveProgress() {
		localStorage.setItem(storageKey, JSON.stringify(progress));
		if (!progressUrl) return;

		fetch(progressUrl, {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(progress)
		}).catch(function () {
			feedbackEl.textContent = 'Saved in this browser. Server sync will retry next time.';
		});
	}

	function loadServerProgress() {
		if (!progressUrl) {
			updateStats();
			renderCard();
			return;
		}

		fetch(progressUrl, { credentials: 'same-origin' })
			.then(function (response) { return response.ok ? response.json() : null; })
			.then(function (payload) {
				if (payload && payload.ok && payload.progress) {
					progress = normalizeProgress(payload.progress);
					localStorage.setItem(storageKey, JSON.stringify(progress));
				}
			})
			.catch(function () {})
			.finally(function () {
				updateStats();
				renderCard();
			});
	}

	cardButton.addEventListener('click', function () {
		if (current) speak(current);
	});
	listenButton.addEventListener('click', function () {
		if (current) speak(current);
	});
	nextButton.addEventListener('click', renderCard);
	typeForm.addEventListener('submit', function (event) {
		event.preventDefault();
		checkAnswer(typeAnswer.value);
	});
	resetButton.addEventListener('click', function () {
		if (!window.confirm('Reset hiragana progress for this login?')) return;
		progress = normalizeProgress({});
		saveProgress();
		updateStats();
		renderCard();
	});

	loadServerProgress();
	}

	const lineButtons = document.querySelectorAll('[data-speak-text]');
	lineButtons.forEach(function (button) {
		button.addEventListener('click', function () {
			const text = button.getAttribute('data-speak-text') || '';
			if (!text) return;

			if (!('speechSynthesis' in window)) {
				button.textContent = 'No audio';
				return;
			}

			const utterance = new SpeechSynthesisUtterance(text);
			utterance.lang = 'ja-JP';
			utterance.rate = 0.82;
			utterance.pitch = 1;
			window.speechSynthesis.cancel();
			window.speechSynthesis.speak(utterance);
		});
	});
})();
