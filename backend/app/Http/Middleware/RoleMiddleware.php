<?php

namespace App\Http\Middleware;

use App\Traits\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    use ApiResponse;

    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user('api')?->loadMissing('role');

        if (!$user || !in_array($user->role?->slug, $roles, true)) {
            return $this->forbiddenResponse('Akses ditolak.');
        }

        return $next($request);
    }
}
