# Influence Functions and Midtraining

**tl;dr**: One important part of midtraining and similar interventions (such as SDF) is to instill new abstractions/concepts in the model. This can be understood as a way of modifying the inductive bias of the model. We validate the work of Timaeus on loss kernels, introduce a related method called the preconditioned gradient kernel, and discuss the implications for measuring the effects of midtraining. [Don't make this all orange lmao]

## Abstractions and Inductive Bias

In this context abstraction is a latent variable which *compresses* a dataset in some way. For the an image dataset, the class of an image (e.g. "dog", "car", "pencil") is an abstraction in this sense; learning the class of an image tells you a lot of information about the contents of the image. Abstractions can be hierarchical (e.g. the abstraction "dog" contains the abstractions "beagle", "greyhound", "corgi") and they can be independent (e.g. "dog" contains \{"beagle", "greyhound", "corgi"\} and, independently \{"dog facing left", "dog facing right"\}. Some abstractions take the form of discrete categories \{"McLaren", "BMW", "Hyundai"\} while some take continuous variables. Abstractions often have fuzzy boundaries (e.g. is a "curtain" a type of "furniture"?).

When working with pretrained LLMs, we often rely on an unspoken assumption: that, for any natural language description of a behaviour, we can train a model to exhibit that behaviour. Why does this often work? It might be because the following two hypotheses hold:

- The \link{Natural Abstraction Hypothesis}[link to John Wentworth as appropriate here] which states that any two systems which model the same data will find a canonical set of abstractions
- The **Inductive Abstraction Hypothesis**[Make this green+bold, not just bold] which states that inductive biases in a pretrained model line up with the abstractions that the model has learned.

Together, these say that the inductive biases of a pretrained LLM will line up with the kinds of concepts that are natural to humans.

## Measuring Inductive Biases

### ImageNET

Timaeus' \link{Loss Kernel}[link to loss kernel work] creates a Loss Kernel $K(X, Y)$, which expresses a particular notion of how _training a model on datapoint $X$ influences its loss on datapoint $Y$_. They find that this metric allows them to find clusters in the loss landscape of an image classifier on ImageNET. We reproduce this work and attempt to extend it to purely generative models trained without the influence of the image classes.

{
Figure: copy Fig 1 from https://jonathanbostock.github.io/vibe-research/bif/imagenet-loss-kernel/ here, link to the page
Caption: comparing UMAP clusters derived from the loss kernels of Inception-V1 (trained with classification loss) and ImageGPT-small (trained with cross-entropy autoregression loss), coloured by underlying class label. Inception shows clear clustering by class label, while ImageGPT-small does not.}
}

{Figure: copy Fig 3 from the same page as above, link to page
Caption: These plots show how effective each loss kernel is at kNN classification. Here we use a relaxed notion of correct classification (taken from Timaeus) involving a taxonomic tree of concepts, e.g. Animal -> Mammal -> Dog -> Beagle, or Object -> Vehicle -> Car -> BMW. Correct classification at depth $n$ means that the classification is correct when we go $n$ steps up from the leaf node. Depending on whether we exclude the correct class from the nearest neighbor results (blue) or include it (orange), the results vary, with higher accuracy when we include the correct class. The effect of excluding the correct class is more pronounced in Inception than in ImageGPT.
}

We can rescue this (partially) by using a preconditioned gradient kernel $G_\mathrm{pre}$. This is a purely local estimation of the inner product of two datapoints' gradient vectors $\nabla_{\mathcal L} X$, $\nabla_{\mathcal L} Y$, scaled by the parameterwise variance in the gradient. This is equivalent to tethering our estimate of $K$ by the Fisher information metric, rather than a gaussian prior, which gives us a kernel we refer to as $K_\mathrm{pre}$

{
Figure: copy Fig 6 from above
Caption: Left: using $G_\mathrm{pre}$ or $K_\mathrm{pre}$ instead of $K$, we obtain a representation which is better able to classify ImageNET by k-nearest neighbors method. It achieves comparable accuracy to a linear probe on the activations of ImageGPT-Small.
Middle: UMAP of $G_\mathrm{pre}$. No distinct clusters are visible, but the datapoints are now sorted by class identity.
}

### MNIST

We also perform a similar classification on MNIST. In this case, the BIF-based Kernel performs much better than $G_\mathrm{pre}$, which we attribute to the fact that our MNIST pixel transformer is trained to convergence, and therefore likely does have singularities (while ImageGPT may not).

{Figure: Fig 1 from https://jonathanbostock.github.io/vibe-research/bif/mnist-grooves/
Caption: Training curves for the transformer.}

{Figure: Fig 1 from https://jonathanbostock.github.io/vibe-research/gradient-kernel/mnist-dynamics/
Caption: the BIF-based $K$ outperforms raw-pixel clustering at predicting digit, while the $G_{pre}$ method spikes early and then drops off.}

{Figure: Fig 9 from https://jonathanbostock.github.io/vibe-research/bif/mnist-grooves/
Caption: Interactive figure showing spectral clustering on the BIF-based $K$ (n.b. this is **not** the method used by Timeaus) at different points in training, and at increasing k. Clusters line up with digits rapidly, but do not line up exactly with digits. We also see some splitting by a "pen stroke width" feature}

{Figure: Fig 4 from https://jonathanbostock.github.io/vibe-research/gradient-kernel/mnist-dynamics/
Caption: Interactive figure showing clustering on $G_\mathrm{pre}$. It is less effective than $K$ for MNIST}

### Pythia 14M

To validate $G_{pre}$, we've repeated Timaeus' experiments on Pythia 14M, though on a smaller dataset. A random sample of clusters from an embedding-free $G_{pre}$ run of the PageRank-based clustering method are shown below:

{Figure: Fig 5 from https://jonathanbostock.github.io/vibe-research/gradient-kernel/clustering-pilot/}

{Figure: Fig 6 from the clustering pilot above
Caption: Cluster map (UMAP) of the no-embedding clusters above.}
