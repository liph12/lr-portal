<?php

namespace App\Models\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InternationalSaleClient extends Model
{
    protected $fillable = ['first_name', 'middle_name', 'last_name', 'email', 'age', 'gender', 'mobile', 'country', 'address'];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(InternationalSale::class, 'international_sale_id');
    }
}
