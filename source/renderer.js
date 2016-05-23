/* global THREE */
/* global $ */

function Renderer() {
    
    this.m_3Scene = new THREE.Scene(); 
    this.m_3Plane = new THREE.Plane( new THREE.Vector3( 0, 1, 0 ), 0 );
    this.m_3Raycaster = new THREE.Raycaster();

    // Startup the loading manager
    this.m_3LoadManager = new THREE.LoadingManager();
	this.m_3LoadManager.onProgress = function( item, loaded, total ) {
		console.log( item, loaded, total );
	};
	
	this.m_3Scene.add( new THREE.AmbientLight( 0x101030 ) );
	
	var directionalLight = new THREE.DirectionalLight( 0xffeedd );
	directionalLight.position.set( 0, 0, 1 );
	this.m_3Scene.add( directionalLight );
				
	this.m_3LoadManager.onLoad = function() {
	    this.onLoad();
	}.bind(this);
				
	// Start up the geometry loader
	this.m_3OBJLoader = new THREE.OBJLoader( this.m_3LoadManager );
    this.m_3Textureloader = new THREE.TextureLoader( this.m_3LoadManager );
    
    this.m_3Geos = {};
    this.m_3Materials = {};
    this.m_3RenderObjects = {};
}

//==============================================================================
Renderer.prototype.Init = function( canvas ) {
    
    var setWidth = window.innerWidth;
    var setHeight = window.innerHeight;

    this.m_3Camera = new THREE.PerspectiveCamera(45, 
        setWidth /  setHeight, 
        0.1, 
        10000);
    this.m_3Camera.position.z = 1000;

    this.m_3Renderer = new THREE.WebGLRenderer({
        canvas: canvas
    });
    
    this.m_3Renderer.setPixelRatio( window.devicePixelRatio );
    this.m_3Renderer.setSize(setWidth, setHeight);
    this.m_3Renderer.setClearColor( 0x254B96 );
    
    window.onresize = function() {
        this.onResize( window.innerWidth,  window.innerHeight );
    }.bind(this);
};

//==============================================================================
Renderer.prototype.onResize = function( _nWidth, _nHeight) {
    this.m_3Camera.aspect = _nWidth / _nHeight;
    this.m_3Camera.updateProjectionMatrix();

    this.m_3Renderer.setSize(_nWidth, _nHeight);
};

//==============================================================================
Renderer.prototype.Load = function() {
    var that = this;
    $.getJSON("resources/index.json", function(_Index) {
        
        for( var objName in _Index.objects) {
            var currObj = _Index.objects[objName];
            
            for( var i = 0; i < currObj.meshes.length; ++i ) {
                var currMesh = currObj.meshes[i];
                
                that.LoadMaterial( currMesh.tex );
                that.LoadGeometry( currMesh.geo );
            }
            
            that.m_3RenderObjects[ objName ] = currObj;
        }
    });
};

//==============================================================================
Renderer.prototype.LoadMaterial = function(_path ) {
    
    if( this.m_3Materials[_path] != null ) {
        return;
    }
    
    var that = this;
    this.m_3Textureloader.load( "resources/" + _path, function ( texture ) {
        
		var material = new THREE.MeshLambertMaterial({
            color: 'white',
            map: texture
        });
        
        that.m_3Materials[_path] = material;
        
	}, this.onProgress, this.onError );
};

//==============================================================================
Renderer.prototype.LoadGeometry = function(_path ) {
    
    if( this.m_3Geos[_path] != null ) {
        return;
    }
    
    var that = this;
    this.m_3OBJLoader.load( "resources/" + _path, function ( object ) {
        
        object.traverse( function ( child ) {
			if ( child instanceof THREE.Mesh ) {
				that.m_3Geos[_path] = child.geometry;
			}
		});
		
	}, this.onProgress, this.onError );
};

//==============================================================================
Renderer.prototype.onProgress = function( xhr ) {
	if ( xhr.lengthComputable ) {
		var percentComplete = xhr.loaded / xhr.total * 100;
		console.log( Math.round( percentComplete, 2 ) + '% downloaded' );
	}
};

//==============================================================================
Renderer.prototype.onError = function( xhr ) {
    
};

// empty default just to have it exist
//==============================================================================
Renderer.prototype.onload = function() {
    
};

//==============================================================================
Renderer.prototype.Render = function() {

    // Handled queued camera movement
    //this.m_3Camera.position.x += this.m_fCameraMoveX;
    //this.m_3Camera.position.z += this.m_fCameraMoveZ;
    //this.m_3Camera.updateProjectionMatrix();

    //this.m_fCameraMoveX = 0.0;
    //this.m_fCameraMoveZ = 0.0;

    this.m_3Renderer.render( this.m_3Scene, this.m_3Camera);
};

//==============================================================================
Renderer.prototype.CreateRenderObject = function(_name) {
    var newObject = new THREE.Object3D();

    var sourceObject = this.m_3RenderObjects[ _name ];
    if( sourceObject == null )
        return newObject;

    for( var i = 0; i < sourceObject.meshes.length; ++i ) {
        var currMesh = sourceObject.meshes[i];
        var sourceGeo = this.m_3Geos[ currMesh.geo ];
        var sourceTex = this.m_3Materials[ currMesh.tex ];

        var newMesh = new THREE.Mesh(sourceGeo, sourceTex);
        newObject.add(newMesh);
    }
    
    this.m_3Scene.add(newObject);
    return newObject;
};

//==============================================================================
Renderer.prototype.RemoveRenderObject = function( _object ) {
    if( _object.meshes ) {
        for( var i = 0; i < _object.meshes.length; ++i ) {
            var currMesh = _object.meshes[i];
            this.m_3Scene.remove( currMesh );
        }
    }
};

//==============================================================================
// Order is: BotLeft, TopLeft, TopRight, BotRight
Renderer.prototype.GetCameraWorldCorners = function() {

    var corners = [];

    corners.push( this.ScreenToGamePoint(-1,-1) );
    corners.push( this.ScreenToGamePoint(-1, 1) );
    corners.push( this.ScreenToGamePoint( 1, 1) );
    corners.push( this.ScreenToGamePoint( 1,-1) );
    return corners;
};

//==============================================================================
Renderer.prototype.ScreenToGamePoint = function( _fScreenPosX, _fScreenPosY ) {
    this.m_3Raycaster.setFromCamera( new THREE.Vector2( _fScreenPosX, _fScreenPosY ), this.m_3Camera );
    var threeIntersect = this.m_3Raycaster.ray.intersectPlane( this.m_3Plane );
    return {x:threeIntersect.x, z:threeIntersect.z};
};
    
if( !window.engine )
    window.engine = {};

window.engine.Renderer = new Renderer();