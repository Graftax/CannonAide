/* global THREE */
/* global $ */

//==============================================================================
function GameObject(_3DObject, _colliderList) {
    this.m_3vPrevPos = new THREE.Vector3(0, 0, 0);
    this.m_3vCurrPos = new THREE.Vector3(0, 0, 0);

    this.m_bCollisionPhysics = false;

    this.m_3DObject = _3DObject;
    this.m_3Colliders = _colliderList;
    
    this.m_gobParent = null;
    this.m_gobChildren = [];

    this.m_onUpdateCallbacks = [];
    this.m_onCollisionCallbacks = [];
    this.m_onDestroyCallbacks = [];

    this.isDestroyed = false;
    this.m_timeSinceDamage = 60;
}

//==============================================================================
GameObject.prototype.SetPosition = function(_x, _y) {

    var vOffset = new THREE.Vector2();
    vOffset.subVectors(this.m_3vPrevPos, this.m_3vCurrPos);

    this.m_3vCurrPos.set(_x, _y);
    this.m_3vPrevPos.set(_x, _y);
    
    if (this.m_3DObject) {
        this.m_3DObject.position.x = this.m_3vCurrPos.x;
        this.m_3DObject.position.y = this.m_3vCurrPos.y;
    }
};

//==============================================================================
GameObject.prototype.ShiftPostion = function(_x, _y) {
    this.m_3vCurrPos.x += _x;
    this.m_3vCurrPos.y += _y;
};

//==============================================================================
GameObject.prototype.GetPosition = function() {
    return this.m_3vCurrPos;
};

//==============================================================================
GameObject.prototype.SetVelocity = function(_x, _y) {
    var vNewVel = new THREE.Vector2(-_x, -_y);
    this.m_3vPrevPos.addVectors(this.m_3vCurrPos, vNewVel);
};

//==============================================================================
GameObject.prototype.AddVelocity = function(_x, _y, _cap) {
    var vNewVel = new THREE.Vector2(-_x, -_y);
    this.m_3vPrevPos.addVectors(this.m_3vPrevPos, vNewVel);

    if (_cap) {
        var vToOldPos = this.m_3vPrevPos.sub(this.m_3vCurrPos);
        vToOldPos.clampLength(-_cap, _cap);
        this.m_3vPrevPos.addVectors(this.m_3vCurrPos, vToOldPos);
    }
};

//==============================================================================
GameObject.prototype.GetVelocity = function() {
    return new THREE.Vector2(this.m_3vCurrPos.x - this.m_3vPrevPos.x, this.m_3vCurrPos.y - this.m_3vPrevPos.y);
};

//==============================================================================
GameObject.prototype.InterpolatePosition = function( _timeAhead ) {
    
    var vel = this.GetVelocity();
    vel.multiplyScalar( _timeAhead );
    
    if (this.m_3DObject) {
        this.m_3DObject.position.x = this.m_3vCurrPos.x + vel.x;
        this.m_3DObject.position.y = this.m_3vCurrPos.y + vel.y;
    }
};

//==============================================================================
GameObject.prototype.Get3DObject = function() {
    return this.m_3DObject;
};

GameObject.prototype.AddUpdateCallback = function(_callback) {

    this.m_onUpdateCallbacks.push(_callback.bind(this));
};

//==============================================================================
GameObject.prototype.Update = function(_fDelta) {

    if (this.m_nHealth) {
        this.m_timeSinceDamage += _fDelta;
    }
    
    for (var updateItr in this.m_onUpdateCallbacks) {
        var currCall = this.m_onUpdateCallbacks[updateItr];
        currCall(_fDelta);
    }
};

//==============================================================================
GameObject.prototype.FixedUpdate = function() {

    var newPrevPos = this.m_3vCurrPos.clone();
    this.m_3vCurrPos.multiplyScalar(2);
    this.m_3vCurrPos.subVectors(this.m_3vCurrPos, this.m_3vPrevPos);
    this.m_3vPrevPos = newPrevPos;

    if (this.m_3DObject) {
        this.m_3DObject.position.x = this.m_3vCurrPos.x;
        this.m_3DObject.position.y = this.m_3vCurrPos.y;
    }
};

//==============================================================================
GameObject.prototype.AddCollider = function(_collider) {
    this.m_3Colliders.push(_collider);
};

//==============================================================================
GameObject.prototype.GetColliderCount = function() {

    if (this.m_3Colliders)
        return this.m_3Colliders.length;

    return 0;
};

//==============================================================================
GameObject.prototype.GetCollider = function(_nIndex) {
    var collSource = this.m_3Colliders[_nIndex];

    var v2Min = new THREE.Vector2(collSource.left, collSource.bottom);
    var v2Max = new THREE.Vector2(collSource.right, collSource.top);
    v2Min.add(this.m_3vCurrPos);
    v2Max.add(this.m_3vCurrPos);

    var newBox = new THREE.Box2(v2Min, v2Max);
    // decoreate the box
    newBox.layer = collSource["layer"];
    newBox.physics = collSource["physics"];
    newBox.parent = this;

    return newBox;
};

//==============================================================================
GameObject.prototype.AddCollisionCallback = function(_callback) {

    this.m_onCollisionCallbacks.push(_callback.bind(this));
};

//==============================================================================
GameObject.prototype.onCollision = function(_otherGameobject) {

    for (var itr in this.m_onCollisionCallbacks) {
        var currCall = this.m_onCollisionCallbacks[itr];
        currCall(_otherGameobject);
    }
};

GameObject.prototype.Damage = function(_amount) {
    if (this.m_nHealth) {
        this.m_nHealth -= _amount;

        if (this.m_nHealth < 1) {
            window.engine.GameManager.Destroy(this);
        }
        
        this.m_timeSinceDamage = 0;
    }
};

GameObject.prototype.AddDestroyCallback = function(_callback) {

    this.m_onDestroyCallbacks.push(_callback.bind(this));
};

GameObject.prototype.AddChild = function( _child ) {
    
    if( this.m_gobChildren.indexOf( _child ) < 0 ) {
        this.m_gobChildren.push(_child);
    }
    
    _child.m_gobParent = this;
};

GameObject.prototype.RemoveChild = function( _child ) {
    
    var objIndex = this.m_gobChildren.indexOf(_child);
    if (objIndex > -1) {
        this.m_gobChildren.splice(objIndex, 1);
        _child.m_gobParent = null;
    }
};

var FIXED_TIMESTEP = 0.0416;

//==============================================================================
//==============================================================================
function GameManager() {
    this.m_nLastUpdate = 0;
    this.m_nFixedTimer = 0;
    this.m_CreateFunctions = {};
    this.m_ObjectTamplates = {};
    this.m_Collisions = [];
    this.m_GameObjects = [];
    this.m_ColliderLayers = {};
    this.m_DestroyQueue = [];
}

//==============================================================================
GameManager.prototype.Load = function(_path, _collPath) {
    var that = this;
    $.getJSON(_path, function(_Index) {

        for (var objName in _Index.objects) {
            that.m_ObjectTamplates[objName] = _Index.objects[objName];
        }

        $.getJSON(_collPath, function(_collIndex) {

            that.m_Collisions = _collIndex["collisions"];
            that.onload();

        }).fail(function() {
            console.log("Failed to load '" + _path + "'.");
        });

    }).fail(function() {
        console.log("Failed to load '" + _path + "'.");
    });
};

// empty default just to have it exist
//==============================================================================
GameManager.prototype.onload = function() {

};

//==============================================================================
GameManager.prototype.GetColliders = function(_name) {

    return this.m_ObjectTamplates[_name]["colliders"];
};

//==============================================================================
GameManager.prototype.Start = function() {
    this.m_nLastUpdate = Date.now();
};

//==============================================================================
GameManager.prototype.AddObjectFunction = function(_name, _funcCreate) {
    this.m_CreateFunctions[_name] = _funcCreate;
};

//==============================================================================
GameManager.prototype.SpawnObject = function(_name) {

    var d3Object = null;
    var templateObject = this.m_ObjectTamplates[_name];
    var gameObject = null;

    if (templateObject) {
        d3Object = window.engine.Renderer.CreateRenderObject(templateObject["elements"]);
    }
    else {
        console.warn("No object template found for '" + _name + "'.");
    }

    if (this.m_CreateFunctions[_name]) {
        gameObject = this.m_CreateFunctions[_name](null, d3Object);
        if (!gameObject) {
            console.error("Create function '" + _name + "' did not return an object.");
            return;
        }
    }
    else {
        gameObject = new GameObject(d3Object, this.GetColliders(_name));
    }

    for (var i = 0; i < gameObject.GetColliderCount(); ++i) {
        var currColl = gameObject.GetCollider(i);

        var layerArray = this.m_ColliderLayers[currColl.layer];
        if (!layerArray) {
            layerArray = [];
            this.m_ColliderLayers[currColl.layer] = layerArray;
        }

        layerArray.push({
            object: gameObject,
            index: i
        });
    }

    this.m_GameObjects.push(gameObject);

    return gameObject;
};

//==============================================================================
GameManager.prototype.Update = function() {

    // Clean up objects to destroy
    while (this.m_DestroyQueue.length > 0) {
        var currDestroy = this.m_DestroyQueue[0];

        if (!currDestroy.gmpQuiteDeath) {
            for (var itr in currDestroy.m_onDestroyCallbacks) {
                currDestroy.m_onDestroyCallbacks[itr]();
            }
        }


        if (currDestroy.m_3DObject) {
            window.engine.Renderer.Remove3DObject(currDestroy.m_3DObject);
        }

        this.RemoveGameObject(currDestroy);

        this.m_DestroyQueue.shift();
    }


    // Calculate delta time
    var now = Date.now();
    var dt = (now - this.m_nLastUpdate) / 1000;
    this.m_nLastUpdate = now;
    
    if( dt > 0.1 ) {
        dt = 0.1;
    }

    this.m_nFixedTimer += dt;

    while (this.m_nFixedTimer > FIXED_TIMESTEP) {
        this.m_nFixedTimer -= FIXED_TIMESTEP;
        this.m_GameObjects.forEach(function(currentValue, index, array) {
            currentValue.FixedUpdate(FIXED_TIMESTEP);
        });

        for (var c = 0; c < this.m_Collisions.length; ++c) {
            var currCollision = this.m_Collisions[c];

            var firstLayer = this.m_ColliderLayers[currCollision[0]];
            var secondLayer = this.m_ColliderLayers[currCollision[1]];

            if (!firstLayer || !secondLayer)
                continue;

            for (var i = 0; i < firstLayer.length; ++i) {
                var firstCollider = firstLayer[i].object.GetCollider(firstLayer[i].index);

                for (var n = 0; n < secondLayer.length; ++n) {
                    var secondCollider = secondLayer[n].object.GetCollider(secondLayer[n].index);

                    if (this.DoCollision(firstCollider.parent, firstCollider, secondCollider.parent, secondCollider)) {
                        firstCollider.parent.onCollision(secondCollider);
                        secondCollider.parent.onCollision(firstCollider);
                    }
                }
            }
        }
    }

    var that = this;
    this.m_GameObjects.forEach(function(currentValue, index, array) {
        currentValue.InterpolatePosition( that.m_nFixedTimer / FIXED_TIMESTEP );
        currentValue.Update(dt);
    });
};

//==============================================================================
GameManager.prototype.DoCollision = function(_object1, _collider1, _object2, _collider2) {

    if (!_collider1 || !_collider2)
        return false;

    if (Object.is(_object1, _object2))
        return false;

    if (_collider1.intersectsBox(_collider2)) {

        var vToColl2 = _collider2.center().sub(_collider1.center());

        var xSign = Math.sign(vToColl2.x);
        vToColl2.x = Math.abs(_collider1.size().x / 2 + _collider2.size().x / 2 - Math.abs(vToColl2.x));

        var ySign = Math.sign(vToColl2.y);
        vToColl2.y = Math.abs(_collider1.size().y / 2 + _collider2.size().y / 2 - Math.abs(vToColl2.y));

        if (_collider1.physics && _collider2.physics) {

            if (Math.abs(vToColl2.x) < Math.abs(vToColl2.y)) {

                _object1.ShiftPostion(vToColl2.x / -2 * xSign, 0);
                _object2.ShiftPostion(vToColl2.x / 2 * xSign, 0);
            }
            else {

                _object1.ShiftPostion(0, vToColl2.y / -2 * ySign);
                _object2.ShiftPostion(0, vToColl2.y / 2 * ySign);
            }
        }

        return true;
    }

    return false;
};

GameManager.prototype.Destroy = function(_object, _isQuiet) {
    if (!this.m_DestroyQueue.includes(_object)) {

        if (_isQuiet)
            _object.gmpQuiteDeath = true;

        this.m_DestroyQueue.push(_object);
    }
};

GameManager.prototype.DestroyAll = function() {

    var that = this;
    this.m_GameObjects.forEach(function(currObj) {
        that.Destroy(currObj, true);
    });
};

//==============================================================================
GameManager.prototype.RemoveGameObject = function(_object) {

    for (var i = 0; i < _object.GetColliderCount(); ++i) {
        var currColl = _object.GetCollider(i);

        var currLayer = this.m_ColliderLayers[currColl.layer];
        var index = currLayer.findIndex(function(element, index, array) {
            return Object.is(element.object, _object) && element.index == i;
        });

        currLayer.splice(index, 1);
    }

    var objIndex = this.m_GameObjects.indexOf(_object);
    if (objIndex > -1) {
        this.m_GameObjects.splice(objIndex, 1);
    }
    
    if( _object.m_gobParent ) {
        _object.m_gobParent.RemoveChild( _object );
    }
    
    for( var n = 0; n < _object.m_gobChildren.length; ++n ) {
        this.RemoveGameObject( _object.m_gobChildren[n] );
    }
};

if (!window.engine)
    window.engine = {};

window.engine.GameManager = new GameManager();