<?php

test('the root sends guests to sign in', function () {
    $this->get('/')->assertRedirect(route('login'));
});
