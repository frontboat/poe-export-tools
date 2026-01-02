# Philosophy

Try/Catch is essential for reliable systems, yet overuse leads to unreliability. On the surface, try-catch allows us to recover from any error with grace - but it has a dark side...

## Stop _trying_ to hit me and _hit_ Me!

For those strange beasts - programmers who have not watched The Matrix - there is a scene where Neo, with newly acquired Jiu-Jitsu skills downloaded into his brain, is trying to hit Morpheus with no success. Morpheus blocks all his attacks and says:

> _Stop trying to hit me and hit Me!_

When try/catch is overused, the programmer is being cautious, modest, accepting fault. They _try_ to solve the problem, but they don't necessarily solve the problem.

Looking at a more concrete example, imagine we implemented an algorithm to find the average number of hours worked in a week given a set of data. It is possible our algorithm/implementation is wrong. We are after all human. But our goal is **not** to _try_ to write an algorithm. Our goal is **not** to write an algorithm that works _most_ of the time. It's to write the algorithm. Full Stop.

If we write a try/catch around the algorithm, we are admitting that our algorithm might be flawed.

This may feel like we are doing the responsible thing and being realistic about our own fallibility.

In fact we are being irresponsible.

## "Do" or "Do Not". There is No "Try".

A try/catch is added to an algorithm because we feel the algorithm is **risky**. There are two ways to reduce risk:

    1. reduce the likelihood, or
    2. reduce the impact.

Writing a strong algorithm reduces the likelihood to 0 or near 0.

Try/catch can reduce the likelihood if the catch re-attempts code that failed, _if there is reasonable chance a re-attempt will solve the issue_. Re-attempting pure algorithms will never fall into this category.

Try/catch is usually used to reduce the _impact_ of a risk- namely to prevent a complete crash. But the disaster recovery side of try/catch needs to be good, otherwise it may **increase** the impact.

In our example, if other functions depend on the average number of working hours, and that algorithm fails, a complete system failure prevents the error spreading.

If we catch and return "0" _instead_ of crashing, the other functions and system parts are "infected" with an inaccurate result, which in turn infect other parts. Try/catch has caused a **crash** to become a spreading **inaccuracy**, and we have not solved the problem.

If our catch displays an error message instead, we still have a problem - and while the system may be usable to do other unrelated tasks, it isn't able to address all the user's needs as anticipated. **We still have to fix the problem**. Stop _trying_ to hit me and _hit_ me.

In theory try/catch on top of strong, bug free algorithms is the best option to reduce risk. But if the algorithm is bug free, it doesn't need a try/catch, and try/catch **will** slow the algorithm down.

Furthermore, try/catch promotes bad programming by offering an easy way out of addressing algorithmic problems head on, leading to "programming atrophy". This is the dark side of try/catch.

## If at first you don't succeed...

I briefly mentioned try/catch is a necessity for reliable systems and then pointed out how it breaks reliability and reduces programmer ability. I have been careful in the above to make reference to writing try/catch around _algorithms_, not code. By code I mean code that is not calculation/pure function.

Here are the times when a try/catch is useful:

- **Any reads/writes that need to operate over a network** - networks are prone to errors from many different vectors, and not cleaning up network connections in the catch on a network error can lead to problems on the host system that extend beyond the program itself.
- **Around disk access** - for similar reasons to above.
  **Around devices/drivers** - for similar reasons.
  **Around other "Disposable" objects that consume resources.**
  **Around user-input** - unvalidated user input cannot be relied upon for correctness and user-error is likely. A catch can direct the user to fix the problem.
  **Around function/method calls that throw informational exceptions for control-flow reasons** (though if ensuring correct input avoids these exceptions, consider other options).
  **As exception handlers** - in order to gather general information about any problems, but not to recover from them.
  **To reattempt** - when there is reasonable assurance that reattempting could solve the problem.

In short - use try/catch for the areas of your application that are exposed to outside influences and for logic control if applicable.

Write good code, and use try/catch as intended. Sparingly.