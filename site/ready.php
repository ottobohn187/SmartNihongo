<?php namespace ProcessWire;

if(!defined("PROCESSWIRE")) die();

/** @var ProcessWire $wire */

$home = $pages->get('/');
$basicTemplate = $templates->get('basic-page');

if($home->id && $basicTemplate) {
	$ensureLearningPage = function($name, $title, $body = '') use ($pages, $home, $basicTemplate) {
		$learningPage = $pages->get('parent_id=' . (int) $home->id . ', name=' . $name . ', include=all');
		$isNew = !$learningPage->id;

		if($isNew) {
			$learningPage = new Page();
			$learningPage->template = $basicTemplate;
			$learningPage->parent = $home;
			$learningPage->name = $name;
		} else {
			$learningPage->of(false);
		}

		$changed = $isNew;

		if(($isNew || !trim((string) $learningPage->title)) && $learningPage->title !== $title) {
			$learningPage->title = $title;
			$changed = true;
		}

		if($body && $learningPage->hasField('body') && !trim((string) $learningPage->body)) {
			$learningPage->body = $body;
			$changed = true;
		}

		if($learningPage->hasStatus(Page::statusUnpublished)) {
			$learningPage->removeStatus(Page::statusUnpublished);
			$changed = true;
		}

		if($learningPage->hasStatus(Page::statusHidden)) {
			$learningPage->removeStatus(Page::statusHidden);
			$changed = true;
		}

		if($changed) {
			$learningPage->save();
		}
	};

	$ensureLearningPage(
		'flashcards',
		'Hiragana Flashcards',
		'<p>Logged-in hiragana flashcards with audio and progress tracking.</p>'
	);

	$ensureLearningPage(
		'restaurant-talk',
		'Japanese Restaurant Talk',
		'<p>A sample 2D restaurant conversation lesson. More dialogue pages can be added later.</p>'
	);
}
