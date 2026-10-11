<?php

namespace App\Models\Entities;

use Illuminate\Database\Eloquent\Model;

class BrokerageArea extends Model
{
    protected $fillable = ['name', 'address', 'email', 'phone', 'mobile', 'latitude', 'longitude', 'status'];
}
