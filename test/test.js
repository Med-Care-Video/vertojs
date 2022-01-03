import assert from 'assert';
import { Verto } from '..';

describe('Distribution', function() {
    describe('import { Verto }', function() {
        it('should successfuly import Verto', function() {
            assert.notEqual( Verto, undefined );
        });
        it('should be a class', function() {
            assert.equal(typeof Verto, 'function');
        });
        it('should be able to produce a class instance', function() {
            let verto = new Verto({debug: true});
            assert.equal(verto.debug, true)
        });
    });
});

