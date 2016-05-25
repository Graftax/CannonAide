/* global GameObject */

window.engine.GameManager.AddObjectFunction( "humanoid", function( _gameObject, _d3Object ){
    
    var newObj = _gameObject || new GameObject( _d3Object, window.engine.GameManager.GetColliders( "humanoid" ) );
    
    _d3Object.rotation.x = 3.14;
    
    newObj.AddUpdateCallback( function( _fDT ) {
        
       var Input = window.engine.InputManager;
       
       if(Input.IsKeyDown( 37 ) ) {
           
           newObj.AddVelocity( -20 * _fDT, 0, 1 );
       }
       
       if(Input.IsKeyDown( 38 ) ) {
           
           newObj.AddVelocity( 0, 20 * _fDT, 1 );
       }
       
       if(Input.IsKeyDown( 39 ) ) {
           
           newObj.AddVelocity( 20 * _fDT, 0, 1 );
       }
       
       if(Input.IsKeyDown( 40 ) ) {
           
           newObj.AddVelocity( 0, -20 * _fDT, 1 );
       }
       
       if(Input.GetTouchCount() > 0 ) {
           var touch = Input.GetTouch(0);
           var gamePoint = window.engine.Renderer.ScreenToGamePoint( touch.x, 1 - touch.y );
           newObj.SetPosition( gamePoint.x, gamePoint.y + 6.4 );
           newObj.SetVelocity( 0, 0 );
       }
    });
    
    newObj.AddCollisionCallback( function( _otherObj ){

    });

   return newObj;
});