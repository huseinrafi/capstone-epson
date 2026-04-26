<?php

namespace App\Constants;

class RoleConstant
{
    public const OPERATOR_CHECKER_ID = '3aa23da2-c97e-4158-8428-e0407bd0b246';
    public const ADMIN_GUDANG_ID = '1a3c0a92-147a-4e98-a701-ff81bfe2ccdc';
    public const SUPERVISOR_ID = '634cc604-f293-4dee-9ac6-4e279133249c';
    public const MANAJER_ID = 'ced1a293-2aac-43e7-8a78-2c45878aadb4';
    public const DEFAULT_REGISTER_ROLE_ID = self::OPERATOR_CHECKER_ID;

    public const OPERATOR_CHECKER_NAME = 'operator checker';
    public const ADMIN_GUDANG_NAME = 'admin gudang';
    public const SUPERVISOR_NAME = 'supervisor';
    public const MANAJER_NAME = 'manajer';

    public const OPERATOR_CHECKER_SLUG = 'operator_checker';
    public const ADMIN_GUDANG_SLUG = 'admin_gudang';
    public const SUPERVISOR_SLUG = 'supervisor';
    public const MANAJER_SLUG = 'manajer';
    public const DEFAULT_REGISTER_ROLE_SLUG = self::OPERATOR_CHECKER_SLUG;
}
